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

const extract_direct_patch = (normalized_text: string): DiffPatch | null => {
  const lines = normalized_text.split('\n')
  const file_path = extract_file_path_from_lines(lines)

  if (!file_path) {
    Logger.log({
      function_name: 'extract_diff_patches',
      message: 'Direct patch detected but no file path found.',
      data: { clipboard_start: normalized_text.substring(0, 100) }
    })
    return null
  }

  const patch_start_index = find_patch_start_index(lines)
  const patch_content = build_patch_content(lines, file_path, patch_start_index)

  return {
    file_path,
    content: patch_content
  }
}

const extract_code_block_patches = (normalized_text: string): DiffPatch[] => {
  const patches: DiffPatch[] = []
  const lines = normalized_text.split('\n')
  let in_diff_block = false
  let diff_header_detected = false
  let current_patch = ''
  let current_workspace: string | undefined
  let current_file_path: string | undefined

  for (const line of lines) {
    if (line == '```diff' || line == '```patch') {
      in_diff_block = true
      diff_header_detected = false
      current_patch = ''
      current_workspace = undefined
      current_file_path = undefined
      continue
    }

    if (
      in_diff_block &&
      (line.startsWith('---') || line.startsWith('diff --git'))
    ) {
      diff_header_detected = true
    }

    if (!in_diff_block || !diff_header_detected) {
      continue
    }

    if (line == '```') {
      if (current_file_path && current_patch.trim()) {
        const patch_content = process_code_block_patch(
          current_patch,
          current_file_path
        )
        patches.push({
          file_path: current_file_path,
          content: patch_content,
          workspace_name: current_workspace
        })
      }
      in_diff_block = false
      diff_header_detected = false
      continue
    }

    if (!current_file_path) {
      current_file_path = extract_file_path_from_line(line)
      if (current_file_path && line.startsWith('diff --git')) {
        continue
      }
    }

    current_patch += line + '\n'
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

const extract_file_path_from_line = (line: string): string | undefined => {
  const file_path_match = line.match(
    /^\+\+\+ b\/(.+?)(?:\s+\d{4}-\d{2}-\d{2}.*)?$/
  )
  if (file_path_match) {
    return file_path_match[1]
  }

  const git_diff_match = line.match(/^diff --git a\/(.+) b\/(.+)$/)
  if (git_diff_match) {
    return git_diff_match[2]
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

const process_code_block_patch = (
  current_patch: string,
  file_path: string
): string => {
  let patch_content = current_patch

  const patch_lines = patch_content.split('\n')
  const first_header_index = patch_lines.findIndex((line) =>
    line.startsWith('--- ')
  )

  if (first_header_index >= 0) {
    patch_content = patch_lines.slice(first_header_index).join('\n')
  }

  if (!patch_content.includes('--- a/') && !patch_content.includes('+++ b/')) {
    patch_content = `--- a/${file_path}\n+++ b/${file_path}\n${patch_content}`
  }

  const final_patch_lines = patch_content.split('\n')
  const formatted_patch_lines = format_patch_lines(final_patch_lines)

  return ensure_newline_ending(formatted_patch_lines.join('\n'))
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

const format_patch_lines = (lines: string[]): string[] => {
  const formatted_lines: string[] = []
  for (const line of lines) {
    if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      formatted_lines.push(line.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, ''))
    } else {
      const hunk_match = line.match(/^(@@ -\d+,\d+ \+\d+,\d+ @@)(.*)$/)
      if (hunk_match && hunk_match[2].trim() !== '') {
        formatted_lines.push(hunk_match[1])
        formatted_lines.push(hunk_match[2])
      } else {
        formatted_lines.push(line)
      }
    }
  }
  return formatted_lines
}

const ensure_newline_ending = (content: string): string => {
  return content.endsWith('\n') ? content : content + '\n'
}
