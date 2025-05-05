import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { Logger } from '../../../helpers/logger'
import { promisify } from 'util'
import { cleanup_api_response } from '../../../helpers/cleanup-api-response'
import { OriginalFileState } from '../../../types/common'

const execAsync = promisify(exec)

export interface DiffPatch {
  content: string
  workspace_name?: string
}

export async function extract_diff_patches(
  clipboard_text: string
): Promise<DiffPatch[]> {
  const patches: DiffPatch[] = []
  const lines = clipboard_text.split('\n')

  let in_diff_block = false
  let current_patch = ''
  let current_workspace: string | undefined

  for (const line of lines) {
    // Check for diff block start
    if (line.trim() == '```diff') {
      in_diff_block = true
      current_patch = ''
      current_workspace = undefined
      continue
    }

    // Check for diff block end
    if (in_diff_block && line.trim() == '```') {
      // Only add if patch is valid (starts with --- or +++)
      const cleaned_content = cleanup_api_response({ content: current_patch })
      if (cleaned_content.trim().match(/^(---|\+\+\+)/m)) {
        // Ensure patch ends with a newline
        let patchContent = cleaned_content
        if (!patchContent.endsWith('\n')) {
          patchContent += '\n'
        }

        patches.push({
          content: patchContent,
          workspace_name: current_workspace
        })
      }
      in_diff_block = false
      continue
    }

    // Inside diff block
    if (in_diff_block) {
      // Check for workspace comment on first line of patch
      if (!current_patch && line.trim().startsWith('//')) {
        const workspace_match = line.match(/\/\/\s*workspace:\s*(\w+)/)
        if (workspace_match) {
          current_workspace = workspace_match[1]
          continue
        }
      }
      current_patch += line + '\n'
    }
  }

  // Handle last patch if block wasn't closed
  if (in_diff_block) {
    const cleaned_content = cleanup_api_response({ content: current_patch })
    if (cleaned_content.trim().match(/^(---|\+\+\+)/m)) {
      // Ensure patch ends with a newline
      let patchContent = cleaned_content
      if (!patchContent.endsWith('\n')) {
        patchContent += '\n'
      }

      patches.push({
        content: patchContent,
        workspace_name: current_workspace
      })
    }
  }

  return patches
}

/**
 * Extract file paths from a patch content
 */
export function extract_file_paths_from_patch(patch_content: string): string[] {
  const file_paths: string[] = []
  const lines = patch_content.split('\n')

  for (const line of lines) {
    // Look for lines starting with +++ b/ which indicate target files in git patches
    const match = line.match(/^\+\+\+ b\/(.+)$/)
    if (match && match[1]) {
      file_paths.push(match[1])
    }
  }

  return file_paths
}

/**
 * Store the original state of files that will be modified by patches
 */
export async function store_original_file_states(
  patch_content: string,
  workspace_path: string
): Promise<OriginalFileState[]> {
  const file_paths = extract_file_paths_from_patch(patch_content)
  const original_states: OriginalFileState[] = []

  for (const file_path of file_paths) {
    const full_path = path.join(workspace_path, file_path)

    // Check if file exists
    if (fs.existsSync(full_path)) {
      try {
        const content = fs.readFileSync(full_path, 'utf8')
        original_states.push({
          file_path,
          content,
          is_new: false,
          // Extract workspace name from workspace_path if needed
          workspace_name: path.basename(workspace_path)
        })

        Logger.log({
          function_name: 'store_original_file_states',
          message: 'Stored original state for file',
          data: { file_path }
        })
      } catch (error) {
        Logger.error({
          function_name: 'store_original_file_states',
          message: 'Failed to read file content',
          data: { file_path, error }
        })
      }
    } else {
      // File doesn't exist yet, will be created by the patch
      original_states.push({
        file_path,
        content: '',
        is_new: true,
        workspace_name: path.basename(workspace_path)
      })

      Logger.log({
        function_name: 'store_original_file_states',
        message: 'Marked file as new (to be created)',
        data: { file_path }
      })
    }
  }

  return original_states
}

export async function apply_git_patch(
  patch_content: string,
  workspace_path: string
): Promise<{ success: boolean; original_states?: OriginalFileState[] }> {
  try {
    // Store original file states before applying patch
    const original_states = await store_original_file_states(
      patch_content,
      workspace_path
    )

    // Create a temporary file for the patch
    const temp_file = path.join(workspace_path, '.tmp_patch')
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(temp_file),
      Buffer.from(patch_content)
    )

    // Apply the patch
    try {
      // Use git apply with --reject option to generate .rej files for failed hunks
      await execAsync('git apply --reject --whitespace=fix ' + temp_file, {
        cwd: workspace_path
      })

      Logger.log({
        function_name: 'apply_git_patch',
        message: 'Patch applied successfully',
        data: { workspace_path }
      })

      // Clean up temp file
      await vscode.workspace.fs.delete(vscode.Uri.file(temp_file))

      return { success: true, original_states }
    } catch (error: any) {
      // Check if there are .rej files indicating partial failure
      const has_rejects = error.message.includes('.rej')

      if (has_rejects) {
        vscode.window.showWarningMessage(
          'Some parts of the patch could not be applied. Check .rej files for details.'
        )
      } else {
        vscode.window.showErrorMessage(
          `Failed to apply patch: ${error.message || 'Unknown error'}`
        )
      }

      Logger.error({
        function_name: 'apply_git_patch',
        message: 'Error applying patch',
        data: { error, workspace_path }
      })

      // Clean up temp file
      await vscode.workspace.fs.delete(vscode.Uri.file(temp_file))

      return { success: false }
    }
  } catch (error: any) {
    Logger.error({
      function_name: 'apply_git_patch',
      message: 'Error handling patch file',
      data: { error, workspace_path }
    })
    vscode.window.showErrorMessage(
      `Error handling patch: ${error.message || 'Unknown error'}`
    )
    return { success: false }
  }
}
