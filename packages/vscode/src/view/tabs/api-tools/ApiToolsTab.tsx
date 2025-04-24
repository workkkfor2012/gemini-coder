import { Button } from '@ui/components/editor/Button'
import styles from './ApiToolsTab.module.scss'

type Props = {
  vscode: any
  is_visible: boolean
  on_configure_api_tools_click: () => void
  has_active_editor: boolean
}

export const ApiToolsTab: React.FC<Props> = (props) => {
  const handle_execute_command = (command_id: string) => {
    props.vscode.postMessage({ command: 'EXECUTE_COMMAND', command_id })
  }

  const handle_code_completions_more_actions = () => {
    const items = [
      {
        label: 'Get code completion with suggestions',
        command: 'geminiCoder.codeCompletionWithSuggestions'
      },
      {
        label: 'Copy code completion prompt to clipboard',
        command: 'geminiCoder.codeCompletionToClipboard'
      },
      {
        label: 'Copy code completion with suggestions prompt to clipboard',
        command: 'geminiCoder.codeCompletionWithSuggestionsToClipboard'
      }
    ]

    props.vscode.postMessage({
      command: 'SHOW_QUICK_PICK',
      items,
      title: 'Other code completion commands'
    })
  }

  const handle_file_refactoring_more_actions = () => {
    const items = [
      {
        label: 'Copy refactoring prompt to clipboard',
        command: 'geminiCoder.refactorToClipboard'
      }
    ]

    props.vscode.postMessage({
      command: 'SHOW_QUICK_PICK',
      items,
      title: 'Other file refactoring commands'
    })
  }

  const code_completion_title = props.has_active_editor
    ? 'Get code completion at the caret position'
    : 'Requires an active editor'

  const refactor_title = props.has_active_editor
    ? 'Refactor the content of the active file'
    : 'Requires an active editor'

  const apply_chat_response_title = 'Apply chat response from clipboard'

  const configuration_title = 'Configure API tool settings'

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <div className={styles.button_group}>
        <Button
          on_click={() => {
            handle_execute_command('geminiCoder.codeCompletionAutoAccept')
          }}
          on_quick_pick_trigger_click={handle_code_completions_more_actions}
          disabled={!props.has_active_editor}
          title={code_completion_title}
        >
          Get Code Completion
        </Button>
        <Button
          on_click={() => handle_execute_command('geminiCoder.refactor')}
          on_quick_pick_trigger_click={handle_file_refactoring_more_actions}
          disabled={!props.has_active_editor}
          title={refactor_title}
        >
          Refactor Active File
        </Button>
        <Button
          on_click={() =>
            handle_execute_command('geminiCoder.applyChatResponse')
          }
          title={apply_chat_response_title}
        >
          Apply Chat Response
        </Button>
      </div>

      <hr />

      <Button
        on_click={props.on_configure_api_tools_click}
        codicon="settings-gear"
        title={configuration_title}
      >
        Configuration
      </Button>
    </div>
  )
}
