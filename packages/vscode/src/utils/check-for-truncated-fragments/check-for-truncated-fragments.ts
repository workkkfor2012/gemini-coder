export const check_for_truncated_fragments = (text: string): boolean =>
  /^\s*(\/\/|#|--)\s+\.\.\.|^\s*\/\*.*\.\.\..*\*\//m.test(text)
