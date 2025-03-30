import React from 'react'
import styles from './WebsiteActions.module.scss'
import cn from 'classnames'

type Props = {
  is_loading: boolean
  parsed_html: boolean
  is_saved: boolean
  on_save: () => void
  on_remove: () => void
}

export const WebsiteActions: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      {!props.is_loading && (
        <>
          {props.parsed_html ? (
            <div className={styles.actions}>
              {!props.is_saved ? (
                <button
                  onClick={props.on_save}
                  className={cn(
                    styles.actions__button,
                    styles['actions__button--save']
                  )}
                >
                  Enable for context
                </button>
              ) : (
                <button
                  onClick={props.on_remove}
                  className={cn(
                    styles.actions__button,
                    styles['actions__button--delete']
                  )}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <p className={styles.message}>
              No content could be parsed from this page. <br /> Make manual text
              selection.
            </p>
          )}
        </>
      )}
    </div>
  )
}
