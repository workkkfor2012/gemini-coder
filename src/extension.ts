import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
  let disposableSendFimRequest = vscode.commands.registerCommand(
    'extension.sendFimRequest',
    async () => {
      const endpointUrl = vscode.workspace
        .getConfiguration()
        .get<string>('superSimpleFim.endpointUrl')!;
      const bearerTokens = vscode.workspace
        .getConfiguration()
        .get<string>('superSimpleFim.bearerToken');
      const model = vscode.workspace
        .getConfiguration()
        .get<string>('superSimpleFim.model');
      const temperature = vscode.workspace
        .getConfiguration()
        .get<number>('superSimpleFim.temperature');
      const systemInstructions = vscode.workspace
        .getConfiguration()
        .get<string>('superSimpleFim.systemInstructions');
      const instruction = vscode.workspace
        .getConfiguration()
        .get<string>('superSimpleFim.instruction');
      const verbose = vscode.workspace
        .getConfiguration()
        .get<boolean>('superSimpleFim.verbose');

      const tokensArray =
        bearerTokens?.split(',').map((token) => token.trim()) || [];
      const bearerToken =
        tokensArray[Math.floor(Math.random() * tokensArray.length)];

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

        const content = `${payload.before}${
          !documentText.includes('<FIM>') ? '<FIM>' : ''
        }${!documentText.includes('</FIM>') ? '</FIM>' : ''}${payload.after}`;

        const messages = [
          ...(systemInstructions
            ? [{ role: 'system', content: systemInstructions }]
            : []),
          {
            role: 'user',
            content,
          },
        ];

        const body = {
          messages,
          model,
          temperature,
        };

        if (verbose) {
          console.debug('> Super Simple FIM', content);
        }

        try {
          const response = await axios.post(endpointUrl, body, {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          // Extract the content inside the code block
          const completion = response.data.choices[0].message.content;
          const unwrappedCompletion = completion
            .replace(/```[a-zA-Z]*\n([\s\S]*?)```/, '$1')
            .trim();

          // Edit the document to insert the unwrapped completion
          await editor.edit((editBuilder) => {
            let newPosition;
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
              newPosition = document.positionAt(
                fimStart + unwrappedCompletion.length
              );
            } else {
              editBuilder.insert(position, unwrappedCompletion);
              newPosition = position.translate(0, unwrappedCompletion.length);
            }
            editor.selection = new vscode.Selection(newPosition, newPosition);
          });

          vscode.window.showInformationMessage(
            'Super Simple FIM response inserted!'
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

  let disposableInsertFimTokens = vscode.commands.registerCommand(
    'extension.insertFimTokens',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const position = editor.selection.active;
        editor
          .edit((editBuilder) => {
            editBuilder.insert(position, '<FIM></FIM>');
          })
          .then(() => {
            const newPosition = position.translate(0, 5);
            editor.selection = new vscode.Selection(newPosition, newPosition);
          });
      }
    }
  );

  context.subscriptions.push(disposableSendFimRequest);
  context.subscriptions.push(disposableInsertFimTokens);
}

export function deactivate() {}
