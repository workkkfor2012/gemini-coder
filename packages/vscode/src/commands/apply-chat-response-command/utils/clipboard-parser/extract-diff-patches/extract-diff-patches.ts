import { Logger } from '@/helpers/logger'

export type DiffPatch = {
  file_path: string
  content: string
  workspace_name?: string
}

export const extract_diff_patches = (clipboard_text: string): DiffPatch[] => {
  const patches: DiffPatch[] = []
  // Normalize line endings to LF
  const normalized_text = clipboard_text.replace(/\r\n/g, '\n')

  if (
    clipboard_text.startsWith('---') ||
    clipboard_text.startsWith('diff --git')
  ) {
    // Treat the entire text as a single patch
    const lines = normalized_text.split('\n')
    let current_file_path: string | undefined
    let patch_start_index = 0

    // Try to extract file path from +++ b/ line and find where the actual patch starts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const file_path_match = line.match(/^\+\+\+ b\/(.+)$/)
      if (file_path_match) {
        current_file_path = file_path_match[1]
        // Find the corresponding --- line to start the patch from
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].startsWith('--- ')) {
            patch_start_index = j
            break
          }
        }
        break
      }
    }

    if (current_file_path) {
      // Extract patch content starting from the --- line
      let patch_content = lines.slice(patch_start_index).join('\n')
      // Ensure patch ends with a newline
      if (!patch_content.endsWith('\n')) {
        patch_content += '\n'
      }
      patches.push({
        file_path: current_file_path,
        content: patch_content
      })
    } else {
      Logger.log({
        function_name: 'extract_diff_patches',
        message:
          'Direct patch detected but no file path found (+++ b/ line missing).',
        data: { clipboard_start: normalized_text.substring(0, 100) }
      })
    }
    return patches
  } else {
    const lines = normalized_text.split('\n')
    let in_diff_block = false
    let diff_header_detected = false
    let current_patch = ''
    let current_workspace: string | undefined
    let current_file_path: string | undefined

    for (const line of lines) {
      // Check for diff or patch block start
      if (line == '```diff' || line == '```patch') {
        in_diff_block = true
        current_patch = ''
        current_workspace = undefined
        current_file_path = undefined
        continue
      }

      if (line.startsWith('---')) {
        diff_header_detected = true
      }

      if (!diff_header_detected) {
        continue
      }

      // Check for diff block end
      if (in_diff_block && line == '```') {
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
        // Extract file path from the +++ line
        if (!current_file_path) {
          const file_path_match = line.match(/^\+\+\+ b\/(.+)$/)
          if (file_path_match) {
            current_file_path = file_path_match[1]
          }
        }

        current_patch += line + '\n'
      }
    }

    return patches
  }
}
