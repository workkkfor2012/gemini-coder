export const code_completion_instruction =
  'Find correct replacement for <missing text> symbol. Send replacement text in "replacement" XML tags.'
export const code_completion_instruction_external =
  'Find correct replacement text for the <missing text> symbol. Provide the replacement text in a code block, appearing below "**Code completion**" heading. Example of a correctly formatted response:\n**Code completion**\n```[language]\n[replacement text]\n```\n## Why?\n[explanation]\nAlways refer to symbol "<missing_text>" as "cursor position" and "replacement" as "completion".'
export const get_refactoring_instruction = (file_path: string) =>
  `User requested refactor of a file${
    file_path ? ` ${file_path}` : ''
  }. In your response send fully updated <file> only, without explanations or any other text.`
