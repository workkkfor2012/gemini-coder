import { ViewProvider } from '@/view/backend/view-provider'
import { at_sign_quick_pick } from '../../../utils/at-sign-quick-pick'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'

export const handle_at_sign_quick_pick = async (
  provider: ViewProvider
): Promise<void> => {
  const replacement = await at_sign_quick_pick()

  if (!replacement) {
    return
  }

  let current_text = ''

  const mode =
    provider.home_view_type === HOME_VIEW_TYPES.WEB
      ? provider.web_mode
      : provider.api_mode
  if (mode == 'ask') {
    current_text = provider.ask_instructions
  } else if (mode == 'edit') {
    current_text = provider.edit_instructions
  } else if (mode == 'no-context') {
    current_text = provider.no_context_instructions
  }

  const is_after_at_sign = current_text
    .slice(0, provider.caret_position)
    .endsWith('@')
  const text_to_insert = is_after_at_sign ? replacement : `@${replacement}`
  provider.add_text_at_cursor_position(text_to_insert)
}
