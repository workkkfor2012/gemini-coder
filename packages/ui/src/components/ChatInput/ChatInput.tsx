import { useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-textarea-autosize'
import cn from 'classnames'

type Props = {
  value: string
  on_change: (value: string) => void
  on_submit: () => void
  on_copy: () => void
  is_connected: boolean
  submit_disabled_title?: string
  is_fim_mode: boolean
  on_fim_mode_click: () => void
  has_active_editor: boolean
}

export const ChatInput: React.FC<Props> = (props) => {
  const textarea_ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textarea_ref.current) {
      textarea_ref.current.focus()
      textarea_ref.current.select()
    }
  }, [])

  const handle_input_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    props.on_change(e.target.value)
  }

  const handle_submit = () => {
    if (!props.is_connected) return
    props.on_submit()
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key == 'Enter' && e.shiftKey) {
      e.preventDefault()
      props.on_change(props.value + '\n')
    } else if (e.key == 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handle_submit()
    }
  }

  const handle_focus = () => {
    if (textarea_ref.current) {
      textarea_ref.current.select()
    }
  }

  const handle_container_click = () => {
    textarea_ref.current?.focus()
  }

  return (
    <div className={styles.container} onClick={handle_container_click}>
      <TextareaAutosize
        ref={textarea_ref}
        placeholder={
          props.is_fim_mode && props.has_active_editor
            ? 'Enter optional instructions'
            : 'Ask anything'
        }
        value={props.value}
        onChange={handle_input_change}
        onKeyDown={handle_key_down}
        onFocus={handle_focus}
        autoFocus
        className={styles.textarea}
        minRows={2}
        maxRows={12}
      />
      <div className={styles.footer}>
        <div className={styles.footer__modes}>
          <button
            onClick={props.on_fim_mode_click}
            className={cn(styles.footer__modes__button, {
              [styles['footer__modes__button--active']]:
                props.is_fim_mode && props.has_active_editor,
              [styles['footer__modes__button--disabled']]:
                !props.has_active_editor
            })}
            title={
              props.has_active_editor
                ? 'Generate code at cursor position'
                : 'Open any file to generate code at cursor position'
            }
            disabled={!props.has_active_editor}
          >
            <div className={cn('codicon', 'codicon-insert')} />
            FIM
          </button>
        </div>
        <div className={styles.footer__actions}>
          <button
            className={styles.footer__actions__button}
            onClick={props.on_copy}
            title="Copy to clipboard"
          >
            <div className={cn('codicon', 'codicon-copy')} />
          </button>
          <button
            className={styles.footer__actions__button}
            onClick={handle_submit}
            disabled={!props.is_connected}
            title={props.submit_disabled_title || 'Send'}
          >
            <div className={cn('codicon', 'codicon-send')} />
          </button>
        </div>
      </div>
    </div>
  )
}
