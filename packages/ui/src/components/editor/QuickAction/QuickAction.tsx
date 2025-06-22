import React from 'react'
import styles from './QuickAction.module.scss'

type Props = {
  title: React.ReactNode
  description: string
  on_click: () => void
}

export const QuickAction: React.FC<Props> = (props) => {
  return (
    <button className={styles.container} onClick={props.on_click}>
      <div className={styles.title}>{props.title}</div>
      <div className={styles.description}>{props.description}</div>
    </button>
  )
}
