import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { ConfigPresetFormat } from '../helpers/preset-format-converters'
import { handle_send_prompt } from './handle-send-prompt'
import { CHATBOTS } from '@shared/constants/chatbots'

export const handle_send_prompt_with_ai_studio = async (
  provider: ViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const web_chat_presets = config.get<ConfigPresetFormat[]>('presets', [])

  // 查找第一个配置为 "AI Studio" 的预设
  const ai_studio_preset = web_chat_presets.find(
    (preset) => preset.chatbot === 'AI Studio' && CHATBOTS[preset.chatbot]
  )

  if (!ai_studio_preset) {
    vscode.window.showErrorMessage(
      '未找到配置的 "AI Studio" 预设。请在设置中添加一个 AI Studio 预设以使用此功能。'
    )
    return
  }

  // 重用现有的 handle_send_prompt 逻辑，传入找到的预设名称
  await handle_send_prompt(provider, [ai_studio_preset.name])
}
