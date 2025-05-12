import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { Logger } from '../../../helpers/logger'
import { promisify } from 'util'
import { cleanup_api_response } from '../../../helpers/cleanup-api-response'
import { OriginalFileState } from '../../../types/common'
import { format_document } from './format-document'
import { create_safe_path } from '@/utils/path-sanitizer'

const execAsync = promisify(exec)

export type DiffPatch = {
  file_path: string
  content: string
  workspace_name?: string
}

export async function extract_diff_patches(
  clipboard_text: string
): Promise<DiffPatch[]> {
  const patches: DiffPatch[] = []
  // Normalize line endings to LF
  const normalized_text = clipboard_text.replace(/\r\n/g, '\n')
  const lines = normalized_text.split('\n')

  let in_diff_block = false
  let current_patch = ''
  let current_workspace: string | undefined
  let current_file_path: string | undefined

  for (const line of lines) {
    // Check for diff or patch block start
    if (line.trim() == '```diff' || line.trim() == '```patch') {
      in_diff_block = true
      current_patch = ''
      current_workspace = undefined
      current_file_path = undefined
      continue
    }

    // Check for diff block end
    if (in_diff_block && line.trim() == '```') {
      // Only add if patch is valid (starts with ---) and we have a file path
      if (current_patch.startsWith('---') && current_file_path) {
        // Ensure patch ends with a newline
        let patch_content = current_patch
        if (!patch_content.endsWith('\n')) {
          patch_content += '\n'
        }

        patches.push({
          file_path: current_file_path,
          content: patch_content,
          workspace_name: current_workspace
        })
      }
      in_diff_block = false
      continue
    }

    // Inside diff block
    if (in_diff_block) {
      // Check for file path comment on first line of patch
      if (!current_patch) {
        if (line.trim().startsWith('//')) {
          // Check for workspace comment
          const workspace_match = line.match(/\/\/\s*workspace:\s*(\w+)/)
          if (workspace_match) {
            current_workspace = workspace_match[1]
            continue
          }

          // Check for file path comment
          const file_path_match = line.match(/\/\/\s*file_path:\s*(.+)/)
          if (file_path_match) {
            current_file_path = file_path_match[1].trim()
            continue
          }
        }
      }

      // Also extract file path from the patch content itself
      if (!current_file_path) {
        const file_path_match = line.match(/^\+\+\+ b\/(.+)$/)
        if (file_path_match) {
          current_file_path = file_path_match[1]
        }
      }

      current_patch += line + '\n'
    }
  }

  // Handle last patch if block wasn't closed
  if (in_diff_block && current_file_path) {
    const cleaned_content = cleanup_api_response({ content: current_patch })
    if (cleaned_content.trim().match(/^(---|\+\+\+)/m)) {
      // Ensure patch ends with a newline
      let patchContent = cleaned_content
      if (!patchContent.endsWith('\n')) {
        patchContent += '\n'
      }

      patches.push({
        file_path: current_file_path,
        content: patchContent,
        workspace_name: current_workspace
      })
    }
  }

  return patches
}

export function extract_file_paths_from_patch(patch_content: string): string[] {
  const file_paths: string[] = []
  // Normalize line endings to LF
  const normalized_content = patch_content.replace(/\r\n/g, '\n')
  const lines = normalized_content.split('\n')

  for (const line of lines) {
    // Look for lines starting with +++ b/ which indicate target files in git patches
    const match = line.match(/^\+\+\+ b\/(.+)$/)
    if (match && match[1]) {
      file_paths.push(match[1])
    }
  }

  return file_paths
}

export async function store_original_file_states(
  patch_content: string,
  workspace_path: string
): Promise<OriginalFileState[]> {
  const file_paths = extract_file_paths_from_patch(patch_content)
  const original_states: OriginalFileState[] = []

  for (const file_path of file_paths) {
    // Validate the file path is safe before using it
    const safe_path = create_safe_path(workspace_path, file_path)
    if (!safe_path) {
      Logger.error({
        function_name: 'store_original_file_states',
        message: 'Skipping file with unsafe path',
        data: { file_path }
      })
      continue
    }

    if (fs.existsSync(safe_path)) {
      try {
        // Read with binary encoding to preserve line endings
        const content = fs.readFileSync(safe_path, 'utf8')
        original_states.push({
          file_path,
          content,
          is_new: false,
          workspace_name: path.basename(workspace_path)
        })
      } catch (error) {
        Logger.error({
          function_name: 'store_original_file_states',
          message: 'Failed to read file content',
          data: { file_path, error }
        })
      }
    } else {
      original_states.push({
        file_path,
        content: '',
        is_new: true,
        workspace_name: path.basename(workspace_path)
      })
    }
  }

  return original_states
}

// Opens, formats, and saves a list of files.
async function process_modified_files(
  file_paths: string[],
  workspace_path: string
): Promise<void> {
  for (const file_path of file_paths) {
    // Validate the file path is safe before using it
    const safe_path = create_safe_path(workspace_path, file_path)
    if (!safe_path) {
      Logger.error({
        function_name: 'process_modified_files',
        message: 'Skipping file with unsafe path',
        data: { file_path }
      })
      continue
    }

    // Only process if the file exists after the patch application
    if (fs.existsSync(safe_path)) {
      try {
        const uri = vscode.Uri.file(safe_path)
        const document = await vscode.workspace.openTextDocument(uri)
        await vscode.window.showTextDocument(document)

        // Format the document
        await format_document(document)

        // Save the document
        await document.save()

        Logger.log({
          function_name: 'process_modified_files',
          message: 'Successfully processed file',
          data: { file_path }
        })
      } catch (error) {
        Logger.error({
          function_name: 'process_modified_files',
          message: 'Error processing file',
          data: { file_path, error }
        })
      }
    } else {
      Logger.log({
        function_name: 'process_modified_files',
        message:
          'Skipping processing for non-existent file (likely deleted by patch)',
        data: { file_path }
      })
    }
  }
}

export async function apply_git_patch(
  patch_content: string,
  workspace_path: string
): Promise<{ success: boolean; original_states?: OriginalFileState[] }> {
  try {
    // Normalize line endings to LF for git
    const normalized_patch_content = patch_content.replace(/\r\n/g, '\n')

    // Store original file states before applying patch
    const original_states = await store_original_file_states(
      normalized_patch_content,
      workspace_path
    )

    // Create a temporary file for the patch
    const temp_file = path.join(workspace_path, '.tmp_patch')
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(temp_file),
      Buffer.from(normalized_patch_content)
    )

    // Apply the patch
    try {
      // Add the --ignore-whitespace flag to handle whitespace differences on Windows
      await execAsync(
        'git apply --whitespace=fix --ignore-whitespace ' + temp_file,
        {
          cwd: workspace_path
        }
      )

      Logger.log({
        function_name: 'apply_git_patch',
        message: 'Patch applied successfully',
        data: { workspace_path }
      })

      // Extract file paths from the patch and open, format, and save them
      const file_paths = extract_file_paths_from_patch(normalized_patch_content)
      await process_modified_files(file_paths, workspace_path)

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

        // Even with partial failure, try to format the files that were modified
        const file_paths = extract_file_paths_from_patch(
          normalized_patch_content
        )
        await process_modified_files(file_paths, workspace_path)
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
