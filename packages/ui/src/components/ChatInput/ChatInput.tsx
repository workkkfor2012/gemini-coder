import { useRef, useEffect, useMemo } from 'react'
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
  is_selection_placeholder_enabled: boolean
}

export const ChatInput: React.FC<Props> = (props) => {
  const textarea_ref = useRef<HTMLTextAreaElement>(null)
  const highlight_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)

  // Process text to highlight @selection
  const get_highlighted_text = (text: string) => {
    const parts = text.split(/(@selection)/g)
    return parts.map((part, index) => {
      if (part == '@selection') {
        return (
          <span key={index} className={styles.selection_keyword}>
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

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
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // Create new value with newline inserted at cursor position
      const newValue =
        props.value.substring(0, start) + '\n' + props.value.substring(end)

      props.on_change(newValue)

      // Set cursor position after the inserted newline
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
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

  const insert_selection_placeholder = () => {
    if (!textarea_ref.current) return

    const start = textarea_ref.current.selectionStart
    const end = textarea_ref.current.selectionEnd

    const new_value =
      props.value.substring(0, start) +
      '@selection ' +
      props.value.substring(end)

    props.on_change(new_value)

    setTimeout(() => {
      if (textarea_ref.current) {
        textarea_ref.current.selectionStart =
          textarea_ref.current.selectionEnd = start + '@selection '.length
      }
    }, 0)
  }

  const is_selection_placeholder_enabled = useMemo(() => {
    if (
      !props.is_selection_placeholder_enabled ||
      props.value.includes('@selection')
    ) {
      return false
    } else {
      return true
    }
  }, [props.is_selection_placeholder_enabled, props.value])

  return (
    <div
      className={styles.container}
      onClick={handle_container_click}
      ref={container_ref}
    >
      <div className={styles.highlight_container} ref={highlight_ref}>
        {get_highlighted_text(props.value)}
      </div>
      <TextareaAutosize
        ref={textarea_ref}
        placeholder={
          props.is_fim_mode && props.has_active_editor
            ? 'Enter optional suggestions'
            : 'Ask anything'
        }
        value={props.value}
        onChange={handle_input_change}
        onKeyDown={handle_key_down}
        onFocus={handle_focus}
        autoFocus
        className={styles.textarea}
        minRows={2}
      />
      <div className={styles.footer}>
        <div className={styles.footer__left}>
          <button
            onClick={props.on_fim_mode_click}
            className={cn(
              styles.footer__left__button,
              styles['footer__left__button--fim'],
              {
                [styles['footer__left__button--active']]:
                  props.is_fim_mode && props.has_active_editor,
                [styles['footer__left__button--disabled']]:
                  !props.has_active_editor
              }
            )}
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
          {is_selection_placeholder_enabled && (
            <button
              onClick={insert_selection_placeholder}
              className={cn(
                styles.footer__left__button,
                styles['footer__left__button--selection']
              )}
              title="Insert @selection placeholder"
            >
              <span>@selection</span>
            </button>
          )}
        </div>
        <div className={styles.footer__right}>
          <button
            className={styles.footer__right__button}
            onClick={props.on_copy}
            title="Copy to clipboard"
          >
            <div className={cn('codicon', 'codicon-copy')} />
          </button>
          <button
            className={styles.footer__right__button}
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
