import { useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-textarea-autosize'
import cn from 'classnames'

type Props = {
  value: string
  on_change: (value: string) => void
  on_submit: () => void
  on_copy: () => void
  is_submit_disabled: boolean
  submit_disabled_title?: string
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

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      props.on_change(props.value + '\n')
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!props.is_submit_disabled) {
        props.on_submit()
      }
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
        placeholder="Ask anything"
        value={props.value}
        onChange={handle_input_change}
        onKeyDown={handle_key_down}
        onFocus={handle_focus}
        autoFocus
        className={styles.textarea}
        minRows={1}
        maxRows={10}
      />
      <div className={styles.footer}>
        <div></div>
        <div className={styles.footer__actions}>
          <button onClick={props.on_copy}>
            <div className={cn('codicon', 'codicon-copy')} />
          </button>
          <button
            onClick={props.on_submit}
            disabled={props.is_submit_disabled}
            title={props.submit_disabled_title}
          >
            <div className={cn('codicon', 'codicon-link-external')} />
          </button>
        </div>
      </div>
    </div>
  )
}
