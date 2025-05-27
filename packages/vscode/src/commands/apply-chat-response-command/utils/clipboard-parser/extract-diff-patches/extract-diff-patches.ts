import { Logger } from '@/helpers/logger'

export type DiffPatch = {
  file_path: string
  content: string
  workspace_name?: string
}

export const extract_diff_patches = (clipboard_text: string): DiffPatch[] => {
  const patches: DiffPatch[] = []
  const normalized_text = clipboard_text.replace(/\r\n/g, '\n')

  if (
    clipboard_text.startsWith('---') ||
    clipboard_text.startsWith('diff --git')
  ) {
    const patch_info = extract_direct_patch(normalized_text)
    if (patch_info) {
      patches.push(patch_info)
    }
  } else {
    patches.push(...extract_code_block_patches(normalized_text))
  }

  return patches
}

const process_collected_patch_lines = (
  patch_lines_array: string[]
): DiffPatch | null => {
  const joined_patch_text_for_checks = patch_lines_array.join('\n')
  if (joined_patch_text_for_checks.trim() === '') return null

  const file_path = extract_file_path_from_lines(patch_lines_array)

  if (!file_path) {
    Logger.log({
      function_name: 'process_collected_patch_lines',
      message:
        'Could not extract file path from collected patch lines in code block.',
      data: {
        clipboard_start: joined_patch_text_for_checks.substring(0, 200),
        lines_count: patch_lines_array.length
      }
    })
    return null
  }

  const patch_start_idx = find_patch_start_index(patch_lines_array)
  let content_str = build_patch_content(
    patch_lines_array,
    file_path,
    patch_start_idx
  )

  content_str = content_str.trim() // Canonical: remove any leading/trailing whitespace including extra newlines.

  return {
    file_path,
    content: ensure_newline_ending(content_str) // Ensure one trailing newline.
  }
}

const extract_direct_patch = (normalized_text: string): DiffPatch | null => {
  const lines = normalized_text.split('\n')
  const file_path = extract_file_path_from_lines(lines)

  if (!file_path) {
    Logger.log({
      function_name: 'extract_direct_patch',
      message: 'Direct patch detected but no file path found.',
      data: { clipboard_start: normalized_text.substring(0, 100) }
    })
    return null
  }

  const patch_start_index = find_patch_start_index(lines)
  let patch_content = build_patch_content(lines, file_path, patch_start_index)
  patch_content = patch_content.trim() // Canonical: remove any leading/trailing whitespace

  return {
    file_path,
    content: ensure_newline_ending(patch_content) // Ensure one trailing newline
  }
}

const extract_code_block_patches = (normalized_text: string): DiffPatch[] => {
  const patches: DiffPatch[] = []
  const lines = normalized_text.split('\n')
  let in_diff_block = false
  let current_patch_lines: string[] = []

  for (const line of lines) {
    const trimmed_line = line.trim() // Use trimmed line for block delimiters

    if (trimmed_line === '```diff' || trimmed_line === '```patch') {
      // If starting a new diff block, process any previously accumulated patch lines from a malformed block
      if (current_patch_lines.length > 0) {
        const patch_info = process_collected_patch_lines(current_patch_lines)
        if (patch_info) patches.push(patch_info)
      }
      in_diff_block = true
      current_patch_lines = [] // Reset for the new block
      continue
    }

    if (trimmed_line === '```') {
      if (in_diff_block) {
        // Only process if we were in a diff block
        if (current_patch_lines.length > 0) {
          const patch_info = process_collected_patch_lines(current_patch_lines)
          if (patch_info) patches.push(patch_info)
        }
        current_patch_lines = [] // Reset after processing
      }
      in_diff_block = false // Exited diff block
      continue
    }

    if (in_diff_block) {
      const is_potential_new_patch_header =
        line.startsWith('diff --git a/') || line.startsWith('--- a/')

      if (is_potential_new_patch_header && current_patch_lines.length > 0) {
        const contains_plus_plus_plus = current_patch_lines.some((l) =>
          l.startsWith('+++ b/')
        )
        // Also ensure the current lines have at least one of the starting headers.
        const contains_main_header = current_patch_lines.some(
          (l) => l.startsWith('--- a/') || l.startsWith('diff --git a/')
        )

        if (contains_plus_plus_plus && contains_main_header) {
          const patch_info = process_collected_patch_lines(current_patch_lines)
          if (patch_info) patches.push(patch_info)
          current_patch_lines = [line] // Start new patch with the current header line
          continue
        }
      }
      current_patch_lines.push(line) // Add original line, not trimmed_line
    }
  }

  // After loop, if in_diff_block is true (e.g. missing closing ```) and lines were collected
  if (in_diff_block && current_patch_lines.length > 0) {
    const patch_info = process_collected_patch_lines(current_patch_lines)
    if (patch_info) {
      patches.push(patch_info)
    }
  }

  return patches
}

const extract_file_path_from_lines = (lines: string[]): string | undefined => {
  // Try +++ b/ line first
  for (let i = 0; i < lines.length; i++) {
    const file_path_match = lines[i].match(/^\+\+\+ b\/([^\t]+)/)
    if (file_path_match) {
      return file_path_match[1]
    }
  }

  // Try diff --git line
  for (const line of lines) {
    const git_diff_match = line.match(/^diff --git a\/(.+) b\/(.+)$/)
    if (git_diff_match) {
      return git_diff_match[2]
    }
  }

  return undefined
}

const find_patch_start_index = (lines: string[]): number => {
  // Find corresponding --- line for +++ line
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\+\+\+ b\//)) {
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].startsWith('--- ')) {
          return j
        }
      }
    }
  }

  // Find --- line after diff --git
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('diff --git')) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('--- ')) {
          return j
        }
      }
    }
  }

  return -1
}

const build_patch_content = (
  lines: string[],
  file_path: string,
  patch_start_index: number
): string => {
  let patch_content: string

  if (patch_start_index >= 0) {
    const patch_lines = lines.slice(patch_start_index).map((line) => {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        return line.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').replace(/\t.*$/, '')
      }
      return line
    })
    patch_content = patch_lines.join('\n')
  } else {
    // No --- line found, build patch with missing headers
    const content_start_index = lines.findIndex((line) => line.startsWith('@@'))
    const patch_body_lines = lines.slice(content_start_index)
    const formatted_patch_body_lines = format_hunk_headers(patch_body_lines)
    patch_content = `--- a/${file_path}\n+++ b/${file_path}\n${formatted_patch_body_lines.join(
      '\n'
    )}`
  }

  return ensure_newline_ending(patch_content)
}

const format_hunk_headers = (lines: string[]): string[] => {
  const formatted_lines: string[] = []
  for (const line of lines) {
    const hunk_match = line.match(/^(@@ -\d+,\d+ \+\d+,\d+ @@)(.*)$/)
    if (hunk_match && hunk_match[2].trim() !== '') {
      formatted_lines.push(hunk_match[1])
      formatted_lines.push(hunk_match[2])
    } else {
      formatted_lines.push(line)
    }
  }
  return formatted_lines
}

const ensure_newline_ending = (content: string): string => {
  return content.endsWith('\n') ? content : content + '\n'
}
