export const extract_path_from_line_of_code = (line: string): string | null => {
  // First check if the line starts with a comment marker
  if (!/^(\s*)(\/\/|#|--|\/\*|\*|<!--)/.test(line)) {
    return null
  }

  // Strip the comment marker and surrounding whitespace
  const stripped = line
    .trim()
    .replace(/^(?:\/\/|#|--|\/\*|\*|<!--)\s*/, '')
    .trim()

  // Match a path pattern that can include special characters like (), [], etc.
  // First, try to match until the first whitespace or end of string
  const path_match = stripped.match(/^([^\s]+)/)
  if (path_match) {
    const potential_path = path_match[1]

    // Check if it has an extension
    if (/\.\w{1,10}$/.test(potential_path)) {
      return potential_path
    }
  }

  return null
}
