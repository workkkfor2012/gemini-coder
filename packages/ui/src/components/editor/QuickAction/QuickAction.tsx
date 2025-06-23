import React from 'react'
import styles from './QuickAction.module.scss'

type Props = {
  title: string
  description: string
  on_click: () => void
}

export const QuickAction: React.FC<Props> = (props) => {
  return (
    <div
      className={styles.container}
      onClick={props.on_click}
      role="button"
      title={props.description}
    >
      <div className={styles.container__inner}>
        <span>{props.title}</span>
        <span>{props.description}</span>
      </div>
    </div>
  )
}
