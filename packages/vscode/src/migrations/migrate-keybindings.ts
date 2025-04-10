import * as fs from 'fs'
import * as path from 'path'
import * as logger from '../helpers/logger'

const command_renames: Record<string, string> = {
  'geminiCoder.fimCompletion': 'geminiCoder.codeCompletion',
  'geminiCoder.fimCompletionWith': 'geminiCoder.codeCompletionWith',
  'geminiCoder.fimCompletionWithSuggestions':
    'geminiCoder.codeCompletionWithSuggestions',
  'geminiCoder.fimCompletionWithSuggestionsWith':
    'geminiCoder.codeCompletionWithSuggestionsWith',
  'geminiCoder.fimCompletionToClipboard':
    'geminiCoder.codeCompletionToClipboard',
  'geminiCoder.fimCompletionWithSuggestionsToClipboard':
    'geminiCoder.codeCompletionWithSuggestionsToClipboard'
  // Add more mappings if needed
}

/**
 * Migrate keybindings.json commands from old IDs to new IDs.
 */
export async function migrate_keybindings(): Promise<void> {
  try {
    const user_settings_path = get_keybindings_path()

    if (!user_settings_path || !fs.existsSync(user_settings_path)) {
      return
    }

    const content = fs.readFileSync(user_settings_path, 'utf8')
    let keybindings: any[]

    try {
      keybindings = JSON.parse(content)
    } catch {
      // VSCode supports comments and trailing commas, so fallback to parse as JSONC
      keybindings = parse_jsonc(content)
    }

    if (!Array.isArray(keybindings)) {
      return
    }

    let changed = false

    for (const kb of keybindings) {
      if (typeof kb.command === 'string' && command_renames[kb.command]) {
        logger.log({
          function_name: 'migrate_keybindings',
          message: `Updating keybinding command "${kb.command}" to "${
            command_renames[kb.command]
          }"`
        })
        kb.command = command_renames[kb.command]
        changed = true
      }
    }

    if (changed) {
      const updated_content = JSON.stringify(keybindings, null, 2)
      fs.writeFileSync(user_settings_path, updated_content, 'utf8')

      logger.log({
        function_name: 'migrate_keybindings',
        message: 'Keybindings migration complete'
      })
    }
  } catch (error) {
    logger.error({
      function_name: 'migrate_keybindings',
      message: 'Error migrating keybindings',
      data: error
    })
  }
}

/**
 * Determine the user keybindings.json path.
 */
function get_keybindings_path(): string | null {
  const app_data = process.env.APPDATA
  const home = process.env.HOME || process.env.USERPROFILE

  if (!home) return null

  const platform = process.platform
  if (platform === 'win32' && app_data) {
    return path.join(app_data, 'Code', 'User', 'keybindings.json')
  } else if (platform === 'darwin') {
    return path.join(
      home,
      'Library',
      'Application Support',
      'Code',
      'User',
      'keybindings.json'
    )
  } else if (platform === 'linux') {
    return path.join(home, '.config', 'Code', 'User', 'keybindings.json')
  } else {
    return null
  }
}

/**
 * Simple JSONC parser to handle comments/trailing commas.
 */
function parse_jsonc(text: string): any {
  // Remove comments
  const no_comments = text.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
  // Remove trailing commas
  const no_trailing_commas = no_comments.replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(no_trailing_commas)
}
