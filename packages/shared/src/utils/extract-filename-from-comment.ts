export const extract_filename_from_comment = (line: string): string | null => {
  // First check if the line starts with a comment marker
  if (!/^(\s*)(\/\/|#|--|\/\*|\*)/.test(line)) {
    return null
  }

  // Strip the comment marker and surrounding whitespace
  const stripped = line
    .trim()
    .replace(/^(?:\/\/|#|--|\/\*|\*)\s*/, '')
    .trim()

  // Match hidden files (e.g., .gitignore) or regular files with a valid extension
  const path_match = stripped.match(/(?:[\w\-\.\/]+\/)*(?:\.[\w\-.]+|[\w\-.]+\.\w{1,10})/)
  if (path_match) {
    return path_match[0]
  }

  return null
}