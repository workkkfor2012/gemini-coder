/**
 * Cleans up the API response by stripping away code block markers,
 * file markers, leading DOCTYPE tags, and ensuring a trailing newline.
 */
export function cleanup_api_response(content: string): string {
  try {
    // If a markdown code block is detected, extract its contents
    const markdown_regex = /```[^\n]*\n([\s\S]*?)(?:```|$)/m
    const markdown_match = content.match(markdown_regex)
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

    // Remove unexpected DOCTYPE if the content starts with one
    if (content.startsWith('<!DOCTYPE')) {
      content = content.substring(content.indexOf('>') + 1)
    }

    // Trim extra whitespace and append a newline
    return content.trim() + '\n'
  } catch (error) {
    console.error('Error cleaning up API response:', error)
    return content // Return original content if an error occurs
  }
}
