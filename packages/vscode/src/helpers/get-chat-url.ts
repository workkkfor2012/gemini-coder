export function get_chat_url(chat_ui_provider?: string): string {
  switch (chat_ui_provider) {
    case 'AI Studio':
      return 'https://aistudio.google.com/app/prompts/new_chat#gemini-coder'
    case 'DeepSeek':
      return 'https://chat.deepseek.com/#gemini-coder'
    default:
      return 'https://aistudio.google.com/app/prompts/new_chat#gemini-coder'
  }
}
