/**
 * Cleans up the API response by iteratively stripping away wrapper markup
 * at the beginning and end of the content, without affecting the middle content.
 */
export function cleanup_api_response(params: {
  content: string
  end_with_new_line?: boolean
}): string {
  try {
    let content = params.content
    let changed = true

    // Continue processing until no more changes are made
    while (changed) {
      const originalContent = content

      // Attempt to strip opening wrappers (only from the beginning)
      const openingPatterns = [
        /^```[^\n]*\n/, // Markdown code block start
        /^<files[^>]*>\s*\n?/, // Files wrapper start
        /^<file[^>]*>\s*\n?/, // File wrapper start
        /^<!\[CDATA\[\s*\n?/, // CDATA start
        /^<!DOCTYPE[^>]*>\s*\n?/ // DOCTYPE declaration
      ]

      for (const pattern of openingPatterns) {
        const match = content.match(pattern)
        if (match && match.index === 0) {
          content = content.substring(match[0].length)
          break // Only remove one wrapper per iteration
        }
      }

      // Attempt to strip closing wrappers (only from the end)
      const closingPatterns = [
        /\s*```\s*$/, // Markdown code block end
        /\s*<\/files>\s*$/, // Files wrapper end
        /\s*<\/file>\s*$/, // File wrapper end
        /\s*\]\]>\s*$/ // CDATA end
      ]

      for (const pattern of closingPatterns) {
        const match = content.match(pattern)
        if (
          match &&
          match.index !== undefined &&
          match.index + match[0].length === content.length
        ) {
          content = content.substring(0, match.index)
          break // Only remove one wrapper per iteration
        }
      }

      // Check if any changes were made in this iteration
      changed = content !== originalContent
    }

    // Trim any remaining whitespace
    content = content.trim()

    // Add trailing newline if requested
    if (params.end_with_new_line) {
      content += '\n'
    }

    return content
  } catch (error) {
    console.error('Error cleaning up API response:', error)
    return params.content // Return original content if an error occurs
  }
}
