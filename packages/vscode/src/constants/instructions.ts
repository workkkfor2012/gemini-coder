export const code_completion_instruction =
  'Find correct replacement for <missing text> symbol. Respond with replacement text in "replacement" XML tags, without explanations or any other text.'
export const get_refactoring_instruction = (file_path: string) =>
  `User requested refactor of a file${
    file_path ? ` ${file_path}` : ''
  }. Please show me the full code of the updated file, without explanations or any other text, I have a disability which means I can't type and need to be able to copy and paste the full code.`
