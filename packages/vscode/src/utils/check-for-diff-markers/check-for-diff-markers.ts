export const check_for_diff_markers = (text: string): boolean =>
  /^[+-]/.test(text)
