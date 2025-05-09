import { ClipboardFile } from '@/commands/apply-chat-response-command/utils/clipboard-parser'

export const check_for_truncated_fragments = (
  files: ClipboardFile[]
): boolean => {
  // Check each file's content for truncated fragments
  return files.some((file) => {
    const content = file.content
    return /^\s*(\/\/|#|--)\s+\.\.\.|^\s*\/\*.*\.\.\..*\*\//m.test(content)
  })
}
