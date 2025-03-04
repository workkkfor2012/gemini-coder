/**
 * Cleans up the API response by stripping away code block markers,
 * file markers, and ensuring a trailing newline.
 */
export function cleanup_api_response(params: {
  content: string
  end_with_new_line?: boolean
}): string {
  try {
    let content = params.content
    // If a markdown code block is detected, extract its contents
    const markdown_regex = /```[^\n]*\n([\s\S]*?)(?:```|$)/m
    const markdown_match = params.content.match(markdown_regex)
    if (markdown_match) {
      content = markdown_match[1]
    }

    // Remove any file markers we use in context
    content = content.replace(/<files[^>]*>/g, '')
    content = content.replace(/<\/files>/g, '')
    content = content.replace(/<file[^>]*>/g, '')
    content = content.replace(/<\/file>/g, '')

    // Remove CDATA tags
    content = content.replace('<![CDATA[', '')
    content = content.replace(']]>', '')

    // Remove paths that appear at the start of the content
    const filename_regex = /^(?:(?:\w+\/)+[\w.-]+\.[a-zA-Z0-9]+\s*\n?)/
    content = content.replace(filename_regex, '')

    // Trim extra whitespace
    content = content.trim()

    // Add newline only if content contains multiple lines
    if (params.end_with_new_line) {
      content += '\n'
    }

    return content
  } catch (error) {
    console.error('Error cleaning up API response:', error)
    return params.content // Return original content if an error occurs
  }
}
