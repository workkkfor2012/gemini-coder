import React from 'react'
import styles from './ApiToolHeader.module.scss'

type Props = {
  top_line: string
  bottom_line: string
  description: string
}

export const ApiToolHeader: React.FC<Props> = (props) => {
  return (
    <div className={styles.header}>
      <div className={styles.header__top}>
        <span>{props.top_line}</span>
      </div>
      <div className={styles.header__bottom}>{props.bottom_line}</div>
      <div className={styles.header__description}>{props.description}</div>
    </div>
  )
}
