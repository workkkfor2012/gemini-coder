import React, { useState } from 'react'
import styles from './ConfigurationHeader.module.scss'

type Props = {
  top_line: string
  bottom_line: string
  description: string
}

const MAX_LENGHT_BEFORE_TRUNCATION = 200

export const ConfigurationHeader: React.FC<Props> = (props) => {
  const [is_expanded, set_is_expanded] = useState(false)
  const needs_truncation =
    props.description.length > MAX_LENGHT_BEFORE_TRUNCATION

  const truncated_description =
    needs_truncation && !is_expanded
      ? props.description.substring(0, MAX_LENGHT_BEFORE_TRUNCATION) + '...'
      : props.description

  return (
    <div className={styles.header}>
      <div className={styles.header__top}>{props.top_line}</div>
      <div className={styles.header__bottom}>{props.bottom_line}</div>
      <div className={styles.header__description}>
        {truncated_description}
        {needs_truncation && (
          <button
            className={styles.header__readmore}
            onClick={() => set_is_expanded(!is_expanded)}
          >
            {is_expanded ? 'Read less' : 'Read more'}
          </button>
        )}
      </div>
    </div>
  )
}
