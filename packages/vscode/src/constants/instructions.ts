export const code_completion_instruction =
  'Find correct replacement for <missing text> symbol. Respond with replacement text in "replacement" XML tags, without explanations or any other text.'
export const get_refactoring_instruction = (file_path: string) =>
  `User requested refactor of a file${
    file_path ? ` ${file_path}` : ''
  }. In your response send fully updated <file> only, without explanations or any other text.`
