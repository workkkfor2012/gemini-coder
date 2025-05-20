import styles from './Settings.module.scss'
import { Button } from '@ui/components/editor/Button'
import { WebviewMessage } from '@/view/types/messages'
import { ApiToolHeader as UiApiToolHeader } from '@ui/components/editor/ApiToolHeader'

type Props = {
  vscode: any
  is_visible: boolean
}

export const Settings: React.FC<Props> = (props) => {
  const handle_configure_api_providers_click = () => {
    props.vscode.postMessage({
      command: 'CONFIGURE_API_PROVIDERS'
    } as WebviewMessage)
  }

  const handle_setup_code_completions_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_CODE_COMPLETIONS'
    } as WebviewMessage)
  }

  const handle_setup_file_refactoring_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_FILE_REFACTORING'
    } as WebviewMessage)
  }

  const handle_setup_commit_messages_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_COMMIT_MESSAGES'
    } as WebviewMessage)
  }

  const render_api_tool_settings = (params: {
    title: string
    description: string
    on_setup_click: () => void
    button_label: string
  }) => (
    <div className={styles['api-tool']}>
      <UiApiToolHeader
        top_line="API TOOL"
        bottom_line={params.title}
        description={params.description}
      />
      <Button on_click={params.on_setup_click}>{params.button_label}</Button>
    </div>
  )

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <Button on_click={handle_configure_api_providers_click}>
        Configure API Providers
      </Button>
      {render_api_tool_settings({
        title: 'Code Completions',
        description:
          'Use any model for accurate code completions. The tool attaches selected context in each request.',
        on_setup_click: handle_setup_code_completions_click,
        button_label: 'Setup Code Completions API Tool'
      })}
      {render_api_tool_settings({
        title: 'File Refactoring',
        description:
          'Modify the active file based on natural language instructions and integrate chat responses of "truncated" edit format.',
        on_setup_click: handle_setup_file_refactoring_click,
        button_label: 'Setup File Refactoring API Tool'
      })}
      {render_api_tool_settings({
        title: 'Commit Messages',
        description:
          'Generate meaningful commit messages based on diffs and fully attached affected files.',
        on_setup_click: handle_setup_commit_messages_click,
        button_label: 'Setup Commit Messages API Tool'
      })}
    </div>
  )
}
