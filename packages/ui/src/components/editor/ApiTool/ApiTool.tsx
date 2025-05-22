import React, { useState } from 'react'
import styles from './ApiTool.module.scss'

type Props = {
  top_line: string
  bottom_line: string
  description: string
  checkmarks?: string[]
}

const MAX_INIT_LENGTH = 120

export const ApiTool: React.FC<Props> = (props) => {
  const [is_expanded, set_is_expanded] = useState(false)
  const should_truncate = props.description.length > MAX_INIT_LENGTH

  const displayDescription =
    should_truncate && !is_expanded
      ? `${props.description.slice(0, MAX_INIT_LENGTH)}...`
      : props.description

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.header__top}>
          <span>{props.top_line}</span>
        </div>
        <div className={styles.header__bottom}>{props.bottom_line}</div>
      </div>

      <div className={styles.description}>
        {displayDescription}
        {should_truncate && (
          <button
            className={styles.description__toggle}
            onClick={() => set_is_expanded(!is_expanded)}
          >
            {is_expanded ? 'Read less' : 'Read more'}
          </button>
        )}
      </div>

      {props.checkmarks && (
        <div className={styles.checkmarks}>
          {props.checkmarks.map((checkmark, index) => (
            <div key={index} className={styles.checkmarks__item}>
              <span className="codicon codicon-check" />
              <span>{checkmark}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
