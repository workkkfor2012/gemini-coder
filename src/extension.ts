import * as vscode from 'vscode';
import axios from 'axios';
import { CancelTokenSource } from 'axios';
import * as fs from 'fs';
import openaiTokenCounter from 'openai-gpt-token-counter';

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

  function estimateTokens(text: string): number {
    // A rough estimate: assume 1 token per word or punctuation
    const words = text.split(/\s+|\b/);
    return words.filter((word) => word.trim() !== '').length;
  }

  let disposableSendFimRequest = vscode.commands.registerCommand(
    'extension.sendFimRequest',
    async () => {
      const providers =
        vscode.workspace
          .getConfiguration()
          .get<Provider[]>('anyModelFim.providers') || [];
      const defaultProviderName = vscode.workspace
        .getConfiguration()
        .get<string>('anyModelFim.defaultProvider');
      const globalInstruction = vscode.workspace
        .getConfiguration()
        .get<string>('anyModelFim.globalInstruction');

      if (!providers || providers.length === 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        );
        return;
      }

      let selectedProvider: string | undefined;

      // Check if default provider exists in the configured providers
      const defaultProviderExists =
        defaultProviderName &&
        providers.some((p) => p.name === defaultProviderName);

      if (defaultProviderExists) {
        // Use default provider if it exists
        selectedProvider = defaultProviderName;
      } else {
        // Otherwise, let the user select a provider
        selectedProvider = await vscode.window.showQuickPick(
          providers.map((p) => p.name),
          { placeHolder: 'Select a provider' }
        );

        // Set the selected provider as default if:
        // 1. No default was set before OR
        // 2. The existing default provider is no longer in the list
        if (
          selectedProvider &&
          (!defaultProviderName || !defaultProviderExists)
        ) {
          await vscode.workspace
            .getConfiguration()
            .update(
              'anyModelFim.defaultProvider',
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
      const instruction = provider.instruction || globalInstruction;
      const verbose = vscode.workspace
        .getConfiguration()
        .get<boolean>('anyModelFim.verbose');
      const attachOpenFiles = vscode.workspace
        .getConfiguration()
        .get<boolean>('anyModelFim.attachOpenFiles');

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

            let openFilesContent = '';
            if (attachOpenFiles) {
              const openTabs = vscode.window.tabGroups.all
                .flatMap((group) => group.tabs)
                .map((tab) =>
                  tab.input instanceof vscode.TabInputText
                    ? tab.input.uri
                    : null
                )
                .filter((uri): uri is vscode.Uri => uri !== null);

              for (const file of openTabs) {
                const relativePath = vscode.workspace.asRelativePath(file);
                let fileContent = fs.readFileSync(file.fsPath, 'utf8');

                // Remove BOM if present
                if (fileContent.charCodeAt(0) === 0xfeff) {
                  fileContent = fileContent.slice(1);
                }

                const languageId = await getLanguageId(file);

                openFilesContent += `\n<file path="${relativePath}" language="${languageId}">\n${fileContent}\n</file>`;
              }
            }

            const payload = {
              before: `<instruction>${instruction}</instruction>\n<files>${openFilesContent}\n<file path="${vscode.workspace.asRelativePath(
                document.uri
              )}" language="${document.languageId}">\n${textBeforeCursor}`,
              after: `${textAfterCursor}\n</file></files>`,
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

            const estimatedTokenCount = openaiTokenCounter.chat(
              messages,
              'gpt-4'
            );

            if (verbose) {
              console.log('[Any Model FIM] Prompt:', content);
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

            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Window,
                title: `Waiting for code completion response... (~${estimatedTokenCount} tokens)`,
              },
              async (progress) => {
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

                  console.log(
                    '[Any Model FIM] Completion:',
                    unwrappedCompletion
                  );

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

  let disposableChangeDefaultProvider = vscode.commands.registerCommand(
    'extension.changeDefaultProvider',
    async () => {
      const providers =
        vscode.workspace
          .getConfiguration()
          .get<Provider[]>('anyModelFim.providers') || [];

      if (!providers || providers.length === 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        );
        return;
      }

      const selectedProvider = await vscode.window.showQuickPick(
        providers.map((p) => p.name),
        { placeHolder: 'Select a new default provider' }
      );

      if (selectedProvider) {
        await vscode.workspace
          .getConfiguration()
          .update(
            'anyModelFim.defaultProvider',
            selectedProvider,
            vscode.ConfigurationTarget.Global
          );
        vscode.window.showInformationMessage(
          `Default provider changed to: ${selectedProvider}`
        );
      }
    }
  );

  context.subscriptions.push(disposableSendFimRequest);
  context.subscriptions.push(disposableInsertFimTokens);
  context.subscriptions.push(disposableChangeDefaultProvider);
}

export function deactivate() {}

async function getLanguageId(uri: vscode.Uri): Promise<string> {
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    return document.languageId;
  } catch (error) {
    console.error(`Error detecting language for ${uri.fsPath}:`, error);
    return 'plaintext';
  }
}
