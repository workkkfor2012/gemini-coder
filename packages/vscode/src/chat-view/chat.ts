;(function () {
  const vscode = acquireVsCodeApi()

  const instructionInput = document.querySelector(
    '.chat > input'
  ) as HTMLInputElement
  const sendButton = document.getElementById('continue') as HTMLButtonElement

  // Function to handle sending the message
  const sendMessage = () => {
    const instruction = instructionInput.value.trim()

    if (!instruction) {
      vscode.postMessage({
        command: 'showError',
        message: 'Please enter an instruction.'
      })
      return
    }

    // Send the instruction to the extension
    vscode.postMessage({
      command: 'processChatInstruction',
      instruction
    })
  }

  // Event listener for the send button click
  sendButton.addEventListener('click', sendMessage)

  // Event listener for the 'Enter' key press
  instructionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendMessage()
      event.preventDefault() // Prevent the default action
    }
  })
})()
