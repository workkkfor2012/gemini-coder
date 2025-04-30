export const apply_chat_response_button_style = (button: HTMLButtonElement) => {
  button.style.fontSize = '13px'
  button.style.marginLeft = '8px'
  button.style.padding = '4px 9px'
  button.style.borderRadius = '4px'
  button.style.fontWeight = '500'
  button.style.color = 'white'
  button.style.background =
    'linear-gradient(to bottom right, #9168C0 12%, #319749 40%, #42de67 90%)'
  button.style.border = 'none'
  button.style.cursor = 'pointer'
  button.style.transition = 'opacity 0.2s ease-in-out'
}

export const set_button_disabled_state = (button: HTMLButtonElement) => {
  button.disabled = true
  button.style.opacity = '0.5'
  button.style.cursor = 'not-allowed'
  setTimeout(() => {
    button.disabled = false
    button.style.opacity = ''
    button.style.cursor = 'pointer'
  }, 5000)
}