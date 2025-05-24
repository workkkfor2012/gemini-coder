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
    let has_header_lines = false

    // Try to extract file path from +++ b/ line and find where the actual patch starts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const file_path_match = line.match(/^\+\+\+ b\/(.+)$/)
      if (file_path_match) {
        current_file_path = file_path_match[1]
        has_header_lines = true
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

    // If no +++ b/ line found, try to extract from diff --git line
    if (!current_file_path) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const git_diff_match = line.match(/^diff --git a\/(.+) b\/(.+)$/)
        if (git_diff_match) {
          current_file_path = git_diff_match[2] // Use the "b/" path
          patch_start_index = i
          break
        }
      }
    }

    if (current_file_path) {
      let patch_content: string

      if (has_header_lines) {
        // Extract patch content starting from the --- line
        patch_content = lines.slice(patch_start_index).join('\n')
      } else {
        // Add missing header lines for diff --git format without --- +++ lines
        const patch_body_lines = lines.slice(patch_start_index + 1) // Skip the diff --git line

        // Fix formatting: ensure hunk headers are on separate lines
        const formatted_patch_body_lines: string[] = []
        for (const line of patch_body_lines) {
          // Check if line starts with @@ and has content after it without newline
          const hunk_match = line.match(/^(@@ -\d+,\d+ \+\d+,\d+ @@)(.*)$/)
          if (hunk_match && hunk_match[2].trim() != '') {
            // Split hunk header and content onto separate lines
            formatted_patch_body_lines.push(hunk_match[1])
            formatted_patch_body_lines.push(hunk_match[2])
          } else {
            formatted_patch_body_lines.push(line)
          }
        }

        const patch_body = formatted_patch_body_lines.join('\n')
        patch_content = `--- a/${current_file_path}\n+++ b/${current_file_path}\n${patch_body}`
      }

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
        message: 'Direct patch detected but no file path found.',
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
        diff_header_detected = false // Reset for new block
        current_patch = ''
        current_workspace = undefined
        current_file_path = undefined
        continue
      }

      // Only check for diff header when inside a block
      if (
        in_diff_block &&
        (line.startsWith('---') || line.startsWith('diff --git'))
      ) {
        diff_header_detected = true
      }

      // Skip processing if not in a diff block or no header detected yet
      if (!in_diff_block || !diff_header_detected) {
        continue
      }

      // Check for diff block end
      if (line == '```') {
        // Only add if we have a file path and valid patch content
        if (current_file_path && current_patch.trim()) {
          let patch_content = current_patch

          // Check if patch needs header lines added (variant c case)
          if (
            !patch_content.includes('--- a/') &&
            !patch_content.includes('+++ b/')
          ) {
            // This is variant c - add the missing header lines
            patch_content = `--- a/${current_file_path}\n+++ b/${current_file_path}\n${patch_content}`
          }

          // Apply hunk header formatting fix for code block patches too
          const patch_lines = patch_content.split('\n')
          const formatted_patch_lines: string[] = []
          for (const patch_line of patch_lines) {
            // Check if line starts with @@ and has content after it without newline
            const hunk_match = patch_line.match(
              /^(@@ -\d+,\d+ \+\d+,\d+ @@)(.*)$/
            )
            if (hunk_match && hunk_match[2].trim() != '') {
              // Split hunk header and content onto separate lines
              formatted_patch_lines.push(hunk_match[1])
              formatted_patch_lines.push(hunk_match[2])
            } else {
              formatted_patch_lines.push(patch_line)
            }
          }
          patch_content = formatted_patch_lines.join('\n')

          // Ensure patch ends with a newline
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
        diff_header_detected = false // Reset for next potential block
        continue
      }

      // Extract file path from the +++ line or diff --git line
      if (!current_file_path) {
        const file_path_match = line.match(/^\+\+\+ b\/(.+)$/)
        if (file_path_match) {
          current_file_path = file_path_match[1]
        } else {
          const git_diff_match = line.match(/^diff --git a\/(.+) b\/(.+)$/)
          if (git_diff_match) {
            current_file_path = git_diff_match[2] // Use the "b/" path
            // Don't include the diff --git line in the patch content for variant c
            continue
          }
        }
      }

      current_patch += line + '\n'
    }

    return patches
  }
}
