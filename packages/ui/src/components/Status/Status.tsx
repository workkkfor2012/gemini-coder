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
        <a href="https://github.com/robertpiosik/gemini-coder/discussions">
          Feedback
        </a>
        <span>·</span>
        <a href="https://buymeacoffee.com/robertpiosik">Donate</a>
      </div>
    </div>
  )
}
