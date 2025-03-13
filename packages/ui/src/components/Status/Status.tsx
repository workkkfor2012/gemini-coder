import styles from './Status.module.scss'

type Props = {
  is_connected: boolean
}

export const Status: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.status}>
        <div className="codicon codicon-debug-disconnect" />
        <div
          className={`${styles.dot} ${
            props.is_connected
              ? styles['dot--connected']
              : styles['dot--disconnected']
          }`}
        />
      </div>
      <div className={styles.links}>
        <a href="https://gemini-coder.netlify.app/">Docs</a>
        <span>·</span>
        <a href="https://github.com/robertpiosik/gemini-coder">GitHub</a>
        <span>·</span>
        <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder&ssr=false#review-details">
          Guestbook
        </a>
        <span>·</span>
        <a href="https://buymeacoffee.com/robertpiosik">Donate</a>
      </div>
    </div>
  )
}
