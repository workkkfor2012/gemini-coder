import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'extension.sendFimRequest',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const documentText = document.getText();
        const position = editor.selection.active;
        const textBeforeCursor = document.getText(
          new vscode.Range(new vscode.Position(0, 0), position)
        );
        const textAfterCursor = document.getText(
          new vscode.Range(
            position,
            document.positionAt(document.getText().length)
          )
        );

        const instruction =
          'The following text is a Git repository with code. Somewhere in the repository, you will encounter a <FIM></FIM> symbol. Think step by step about what code fits this place best. The text inside the symbol can help you understand the intended filling code. Please send nothing more than the filling code.';

        const openFilesContent = vscode.workspace.textDocuments
          .filter((doc) => doc.uri.toString() !== document.uri.toString())
          .map((doc) => {
            const filePath = vscode.workspace.asRelativePath(doc.uri);
            const fileLanguage = doc.languageId;
            const fileContent = doc.getText();
            return `\n\n## ${filePath}\n\`\`\`${fileLanguage}\n${fileContent}\n\`\`\``;
          })
          .join('');

        const payload = {
          before: `${instruction}\n\n${openFilesContent}\n\n## ${vscode.workspace.asRelativePath(
            document.uri
          )}\n\`\`\`${document.languageId}\n${textBeforeCursor}`,
          after: `${textAfterCursor}\n\`\`\``,
        };

        const body = {
          messages: [
            {
              role: 'user',
              content: `${payload.before}${
                !documentText.includes('<FIM>') ? '<FIM>' : ''
              }${!documentText.includes('</FIM>') ? '</FIM>' : ''}${
                payload.after
              }`,
            },
          ],
          model: 'mistral-large-latest',
          temperature: 0,
        };

        try {
          console.log(body);
          const response = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            body,
            {
              headers: {
                Authorization: 'Bearer jD2bhOIbdvrCAQW5eVBto9k84t1lA5Zn',
                'Content-Type': 'application/json',
              },
            }
          );

          // Extract the content inside the code block
          const completion = response.data.choices[0].message.content;
          const unwrappedCompletion = completion
            .replace(/```[a-zA-Z]*\n([\s\S]*?)```/, '$1')
            .trim();

          // Edit the document to insert the unwrapped completion
          await editor.edit((editBuilder) => {
            if (
              documentText.includes('<FIM>') &&
              documentText.includes('</FIM>')
            ) {
              const fimStart = documentText.indexOf('<FIM>');
              const fimEnd = documentText.indexOf('</FIM>') + '</FIM>'.length;
              const fimRange = new vscode.Range(
                document.positionAt(fimStart),
                document.positionAt(fimEnd)
              );
              editBuilder.replace(fimRange, unwrappedCompletion);
            } else {
              editBuilder.insert(position, unwrappedCompletion);
            }
          });

          vscode.window.showInformationMessage(
            'FIM request sent and response inserted!'
          );
        } catch (error) {
          console.error('POST request failed:', error);
          vscode.window.showErrorMessage(
            'Failed to send POST request. Check console for details.'
          );
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
