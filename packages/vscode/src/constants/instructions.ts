export const code_completion_instruction =
  'Find correct replacement for <missing text> symbol. Send replacement text in "replacement" XML tags.'
export const code_completion_instruction_external =
  'Find correct replacement for <missing text> symbol. Send replacement text and explain your reasoning. Always refer to symbol "<missing_text>" as "cursor position".'
export const get_refactoring_instruction = (file_path: string) =>
  `User requested refactor of a file${
    file_path ? ` ${file_path}` : ''
  }. In your response send fully updated <file> only, without explanations or any other text.`
