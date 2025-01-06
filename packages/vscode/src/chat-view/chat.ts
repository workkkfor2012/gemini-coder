;(function () {
  const vscode = acquireVsCodeApi()

  const instructionInput = document.getElementById(
    'instruction-input'
  ) as HTMLInputElement
  const sendButton = document.getElementById('send-button') as HTMLButtonElement

  sendButton.addEventListener('click', () => {
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
      command: 'copyToClipboard',
      instruction
    })
  })
})()
