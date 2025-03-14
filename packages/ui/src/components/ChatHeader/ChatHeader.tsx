import { useState } from 'react'
import styles from './ChatHeader.module.scss'

export const ChatHeader: React.FC = () => {
  const [show_donate_image, set_show_donate_image] = useState(false)

  const handle_mouse_enter = () => {
    set_show_donate_image(true)
  }

  const handle_mouse_leave = () => {
    set_show_donate_image(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.links}>
        <a href="https://bit.ly/gemini-coder-docs-from-vs-code">Docs</a>
        <span>·</span>
        <a href="https://bit.ly/gemini-coder-github-from-vs-code">GitHub</a>
        <span>·</span>
        <a href="https://bit.ly/gemini-coder-guestbook-from-vs-code">
          Guestbook
        </a>
        <span>·</span>
        <div
          className={styles.tooltipContainer}
          onMouseEnter={handle_mouse_enter}
          onMouseLeave={handle_mouse_leave}
        >
          <a href="bit.ly/donate-to-gemini-coder-from-vs-code">Donate</a>
          {show_donate_image && (
            <div className={styles.tooltip}>
              <img
                src={`${(window as any).resources_uri}/donate.gif`}
                alt="Donate"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
