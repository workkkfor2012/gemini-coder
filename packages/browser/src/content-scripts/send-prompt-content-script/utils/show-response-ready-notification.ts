export const show_response_ready_notification = async (params: {
  chatbot_name: string
}) => {
  if (!('Notification' in window) || document.hasFocus()) {
    return
  }

  let permission = Notification.permission

  if (permission == 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission == 'granted') {
    const notification = new Notification(
      `${params.chatbot_name} finished responding`,
      {
        body: 'The chat response is ready for review.',
        requireInteraction: false,
        silent: false
      }
    )

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }
}
