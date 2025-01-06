const CLIPBOARD_VALUE_PREFIX = 'gemini-coder:'

// read clipboard value, if starts with CLIPBOARD_VALUE_PREFIX, console log it without prefix
const send_prompt = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text.startsWith(CLIPBOARD_VALUE_PREFIX)) {
      const value = text.substring(CLIPBOARD_VALUE_PREFIX.length)
      console.log('Gemini Coder Connector: ', value)
    }
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err)
  }
}

setTimeout(send_prompt, 1000)
