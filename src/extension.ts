import * as vscode from 'vscode';
import axios from 'axios';
import { CancelTokenSource } from 'axios';

interface Provider {
  name: string;
  endpointUrl: string;
  bearerToken: string;
  model: string;
  temperature?: number;
  systemInstructions?: string;
  instruction?: string;
}

export function activate(context: vscode.ExtensionContext) {
  let cancelTokenSource: CancelTokenSource | undefined;

  let disposableSendFimRequest = vscode.commands.registerCommand(
    'extension.sendFimRequest',
    async () => {
      const providers =
        vscode.workspace
          .getConfiguration()
          .get<Provider[]>('superSimpleFim.providers') || [];
      const defaultProviderName = vscode.workspace
        .getConfiguration()
        .get<string>('superSimpleFim.defaultProvider');

      if (!providers || providers.length === 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        );
        return;
      }

      let selectedProvider: string | undefined;
      if (
        defaultProviderName &&
        providers.find((p) => p.name === defaultProviderName)
      ) {
        // Use default provider if it exists
        selectedProvider = defaultProviderName;
      } else {
        // Otherwise, let the user select a provider
        selectedProvider = await vscode.window.showQuickPick(
          providers.map((p) => p.name),
          { placeHolder: 'Select a provider' }
        );

        // Set the selected provider as default if no default was set before
        if (selectedProvider && !defaultProviderName) {
          await vscode.workspace
            .getConfiguration()
            .update(
              'superSimpleFim.defaultProvider',
              selectedProvider,
              vscode.ConfigurationTarget.Global
            );
        }
      }

      if (!selectedProvider) {
        return;
      }

      const provider = providers.find((p) => p.name === selectedProvider)!;

      const endpointUrl = provider.endpointUrl;
      const bearerTokens = provider.bearerToken;
      const model = provider.model;
      const temperature = provider.temperature;
      const systemInstructions = provider.systemInstructions;
      const instruction = provider.instruction;
      const verbose = vscode.workspace
        .getConfiguration()
        .get<boolean>('superSimpleFim.verbose');

      if (!bearerTokens) {
        vscode.window.showErrorMessage(
          'Bearer token is missing. Please add it in the settings.'
        );
        return;
      }

      const tokensArray =
        bearerTokens?.split(',').map((token: string) => token.trim()) || [];
      const bearerToken =
        tokensArray[Math.floor(Math.random() * tokensArray.length)];

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        if (cancelTokenSource) {
          cancelTokenSource.cancel(
            'User moved the cursor, cancelling request.'
          );
        }
        cancelTokenSource = axios.CancelToken.source();

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Window,
            title: 'Waiting for code completion response...',
          },
          async (progress) => {
            progress.report({ increment: 0 });

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
            }${!documentText.includes('</FIM>') ? '</FIM>' : ''}${
              payload.after
            }`;

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

            const cursorListener = vscode.workspace.onDidChangeTextDocument(
              () => {
                if (cancelTokenSource) {
                  cancelTokenSource.cancel(
                    'User moved the cursor, cancelling request.'
                  );
                }
              }
            );

            try {
              const response = await axios.post(endpointUrl, body, {
                headers: {
                  Authorization: `Bearer ${bearerToken}`,
                  'Content-Type': 'application/json',
                },
                cancelToken: cancelTokenSource?.token,
              });

              const completion = response.data.choices[0].message.content;
              const unwrappedCompletion = completion
                .replace(/```[a-zA-Z]*\n([\s\S]*?)```/, '$1')
                .trim();

              await editor.edit((editBuilder) => {
                if (
                  documentText.includes('<FIM>') &&
                  documentText.includes('</FIM>')
                ) {
                  const fimStart = documentText.indexOf('<FIM>');
                  const fimEnd =
                    documentText.indexOf('</FIM>') + '</FIM>'.length;
                  const fimRange = new vscode.Range(
                    document.positionAt(fimStart),
                    document.positionAt(fimEnd)
                  );
                  editBuilder.replace(fimRange, unwrappedCompletion);
                  setTimeout(() => {
                    const newPosition = document.positionAt(
                      fimStart + unwrappedCompletion.length
                    );
                    editor.selection = new vscode.Selection(
                      newPosition,
                      newPosition
                    );
                  }, 50);
                } else {
                  editBuilder.insert(position, unwrappedCompletion);
                  setTimeout(() => {
                    const newPosition = position.translate(
                      0,
                      unwrappedCompletion.length
                    );
                    editor.selection = new vscode.Selection(
                      newPosition,
                      newPosition
                    );
                  }, 50);
                }
              });
            } catch (error) {
              if (axios.isCancel(error)) {
                console.log('Request canceled:', error.message);
              } else {
                console.error('POST request failed:', error);
                vscode.window.showErrorMessage(
                  'Failed to send POST request. Check console for details.'
                );
              }
            } finally {
              cursorListener.dispose();
            }

            progress.report({ increment: 100 });
          }
        );
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
