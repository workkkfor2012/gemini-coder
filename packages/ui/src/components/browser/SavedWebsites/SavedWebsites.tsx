import React from 'react'
import styles from './SavedWebsites.module.scss'
import cn from 'classnames'

export type Website = {
  url: string
  title: string
  content: string
  favicon?: string
  is_enabled: boolean
}

type Props = {
  websites: Website[]
  on_view: (website: Website) => void
  on_delete: (url: string) => void
  on_toggle_enabled: (url: string, is_enabled: boolean) => void
  empty_message?: string
}

export const SavedWebsites: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      {props.websites.length > 0 ? (
        <>
          {props.websites.map((website) => (
            <div key={website.url} className={styles.item}>
              {website.favicon && (
                <img src={website.favicon} className={styles.favicon} alt="" />
              )}
              <div
                className={styles.title}
                onClick={() => props.on_view(website)}
                title={website.title}
              >
                {website.title.length > 30
                  ? website.title.substring(0, 30) + '...'
                  : website.title}
              </div>
              <div className={styles.actions}>
                <label className={styles.toggle}>
                  <input 
                    type="checkbox"
                    checked={website.is_enabled}
                    onChange={(e) => props.on_toggle_enabled(website.url, e.target.checked)}
                    className={styles.toggle__input}
                  />
                  <span className={styles.toggle__label}>
                    {website.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
                <button
                  className={cn(
                    styles.actions__button,
                    styles['actions__button--delete']
                  )}
                  onClick={() => props.on_delete(website.url)}
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className={styles.empty}>
          {props.empty_message || 'No saved websites'}
        </div>
      )}
    </div>
  )
}