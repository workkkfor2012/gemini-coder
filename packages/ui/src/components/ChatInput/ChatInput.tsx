import { useRef, useEffect, useState } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-autosize-textarea'

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
    if (e.key == 'Enter' && e.shiftKey) {
      e.preventDefault()
      props.on_change(props.value + '\n')
    }
  }

  const handle_focus = () => {
    if (textarea_ref.current) {
      textarea_ref.current.select()
    }
  }

  return (
    <div className={styles.container}>
      <TextareaAutosize
        ref={textarea_ref}
        placeholder="Type something"
        value={props.value}
        onChange={handle_input_change}
        onKeyDown={handle_key_down}
        onFocus={handle_focus}
        autoFocus
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
      />
      <div className={styles.buttons}>
        <button
          className={styles.buttons__continue}
          onClick={props.on_submit}
          disabled={props.is_submit_disabled}
          title={props.submit_disabled_title}
        >
          Continue
        </button>
        <button className={styles.buttons__copy} onClick={props.on_copy}>
          Copy
        </button>
      </div>
    </div>
  )
}
