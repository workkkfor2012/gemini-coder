import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs' // Added fs import
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { Logger } from '../helpers/logger'

// State machine states
enum ParserState {
  DEFAULT = 'DEFAULT',
  IN_SINGLE_QUOTE = 'IN_SINGLE_QUOTE',
  IN_DOUBLE_QUOTE = 'IN_DOUBLE_QUOTE',
  IN_BACKTICK = 'IN_BACKTICK',
  IN_PATH = 'IN_PATH'
}

export function select_files_found_in_clipboard_command(
  workspace_provider: WorkspaceProvider | undefined
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'codeWebChat.selectFilesFoundInClipboard',
    async () => {
      if (!workspace_provider) {
        return
      }

      try {
        const clipboard_text = await vscode.env.clipboard.readText()
        if (!clipboard_text) {
          vscode.window.showInformationMessage(
            'No potential file paths found in clipboard.'
          )
          return
        }

        const paths = extract_paths_from_text(clipboard_text)
        if (paths.length == 0) {
          vscode.window.showInformationMessage(
            'No potential file paths found in clipboard.'
          )
          return
        }

        const workspace_roots = workspace_provider.getWorkspaceRoots()
        const absolute_paths: string[] = []

        for (const raw_path of paths) {
          if (path.isAbsolute(raw_path)) {
            absolute_paths.push(raw_path)
            continue
          }

          for (const root of workspace_roots) {
            const potential_path = path.join(root, raw_path)
            absolute_paths.push(potential_path)
          }
        }

        const existing_paths = absolute_paths.filter((p) => {
          try {
            return fs.existsSync(p) && fs.statSync(p).isFile()
          } catch {
            return false
          }
        })

        if (existing_paths.length == 0) {
          vscode.window.showInformationMessage(
            'No matching files found in workspace for the paths in clipboard.'
          )
          return
        }

        Logger.log({
          message: `Selected ${existing_paths.length} files from clipboard`,
          data: { paths: existing_paths }
        })

        await workspace_provider.set_checked_files(existing_paths)
        vscode.window.showInformationMessage(
          `Selected ${existing_paths.length} files from clipboard.`
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to select files from clipboard: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
  )
}

function extract_paths_from_text(text: string): string[] {
  const paths: string[] = []
  let current_path = ''
  let state = ParserState.DEFAULT
  let escape_next = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (escape_next) {
      current_path += char
      escape_next = false
      continue
    }

    switch (state) {
      case ParserState.DEFAULT:
        if (char == '\\') {
          escape_next = true
        } else if (char == "'") {
          state = ParserState.IN_SINGLE_QUOTE
          current_path = ''
        } else if (char == '"') {
          state = ParserState.IN_DOUBLE_QUOTE
          current_path = ''
        } else if (char == '`') {
          state = ParserState.IN_BACKTICK
          current_path = ''
        } else if (is_path_char(char)) {
          state = ParserState.IN_PATH
          current_path = char
        }
        break

      case ParserState.IN_SINGLE_QUOTE:
        if (char == "'") {
          if (current_path) {
            paths.push(current_path)
          }
          state = ParserState.DEFAULT
        } else if (char == '\\') {
          escape_next = true
        } else {
          current_path += char
        }
        break

      case ParserState.IN_DOUBLE_QUOTE:
        if (char == '"') {
          // Fix: This should be `char === '"'`
          if (current_path) {
            paths.push(current_path)
          }
          state = ParserState.DEFAULT
        } else if (char == '\\') {
          escape_next = true
        } else {
          current_path += char
        }
        break

      case ParserState.IN_BACKTICK:
        if (char == '`') {
          if (current_path) {
            paths.push(current_path)
          }
          state = ParserState.DEFAULT
        } else if (char == '\\') {
          escape_next = true
        } else {
          current_path += char
        }
        break

      case ParserState.IN_PATH:
        if (is_path_char(char) || char == '\\' || char == '/') {
          current_path += char
        } else {
          if (current_path) {
            paths.push(current_path)
          }
          state = ParserState.DEFAULT
          i--
        }
        break
    }
  }

  if (state !== ParserState.DEFAULT && current_path) {
    paths.push(current_path)
  }

  return paths.filter((path) => is_potential_file_path(path))
}

function is_path_char(char: string): boolean {
  return /[a-zA-Z0-9_.\-~]/.test(char)
}

function is_potential_file_path(path: string): boolean {
  return path.includes('.') || path.includes('/') || path.includes('\\')
}
