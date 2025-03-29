import styles from './ChatHeader.scss'

export const ChatHeader: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.links}>
        <a href="https://bit.ly/gemini-coder-docs-from-vs-code">Docs</a>
        <span>·</span>
        <a href="https://bit.ly/gemini-coder-github-from-vs-code">GitHub</a>
        <span>·</span>
        <a href="https://github.com/robertpiosik/gemini-coder/discussions">Send feedback</a>
        <span>·</span>
        <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder&ssr=false#review-details">Rate</a>
        <span>·</span>
        <a href="bit.ly/donate-to-gemini-coder-from-vs-code">Donate</a>
      </div>
    </div>
  )
}
