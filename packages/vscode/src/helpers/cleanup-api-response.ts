/**
 * Cleans up the API response by iteratively stripping away wrapper markup
 * at the beginning and end of the content, without affecting the middle content.
 * Also removes <think>...</think> sections from the beginning of the content.
 */
export function cleanup_api_response(params: { content: string }): string {
  try {
    let content = params.content

    // First, handle the specific case of <think>...</think> at the beginning
    const think_pattern = /^<think>([\s\S]*?)<\/think>/
    const think_match = content.match(think_pattern)
    if (think_match) {
      content = content.substring(think_match[0].length).trim()
    }

    let changed = true

    // Continue processing until no more changes are made
    while (changed) {
      const original_content = content

      // Attempt to strip opening wrappers (only from the beginning)
      const opening_patterns = [
        /^```[^\n]*\n/, // Markdown code block start
        /^<files[^>]*>\s*\n?/, // Files wrapper start
        /^<file[^>]*>\s*\n?/, // File wrapper start
        /^<!\[CDATA\[\s*\n?/, // CDATA start
        /^<!DOCTYPE[^>]*>\s*\n?/ // DOCTYPE declaration
      ]

      for (const pattern of opening_patterns) {
        const match = content.match(pattern)
        if (match && match.index == 0) {
          content = content.substring(match[0].length)
          break // Only remove one wrapper per iteration
        }
      }

      // Attempt to strip closing wrappers (only from the end)
      const closing_patterns = [
        /\s*```\s*$/, // Markdown code block end
        /\s*<\/files>\s*$/, // Files wrapper end
        /\s*<\/file>\s*$/, // File wrapper end
        /\s*\]\]>\s*$/, // CDATA end
        /\s*\]\]\s*$/ // Potentially incomplete CDATA end (just "]]", seen in Gemini Flash Thinking reponse)
      ]

      for (const pattern of closing_patterns) {
        const match = content.match(pattern)
        if (
          match &&
          match.index !== undefined &&
          match.index + match[0].length == content.length
        ) {
          content = content.substring(0, match.index)
          break // Only remove one wrapper per iteration
        }
      }

      // Check if any changes were made in this iteration
      changed = content != original_content
    }

    content = content.trim()

    return content
  } catch (error) {
    console.error('Error cleaning up API response:', error)
    return params.content // Return original content if an error occurs
  }
}
