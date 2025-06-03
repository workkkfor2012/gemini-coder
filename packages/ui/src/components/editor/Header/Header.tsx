import styles from './Header.module.scss'
import cn from 'classnames'
import { useEffect, useRef, useState } from 'react'

type Props<T extends string> = {
  tabs: T[]
  active_tab: T
  on_tab_click: (tab: T) => void
}

export const Header = <T extends string>(props: Props<T>) => {
  const tabs_ref = useRef<(HTMLButtonElement | null)[]>([])
  const [underline_style, set_underline_style] = useState<{
    width: number
    left: number
  }>({ width: 0, left: 0 })

  useEffect(() => {
    const active_index = props.tabs.findIndex((tab) => tab == props.active_tab)
    const active_tab_element = tabs_ref.current[active_index]

    if (active_tab_element) {
      const tabs_container = active_tab_element.parentElement
      if (tabs_container) {
        const container_rect = tabs_container.getBoundingClientRect()
        const active_rect = active_tab_element.getBoundingClientRect()

        set_underline_style({
          width: active_rect.width,
          left: active_rect.left - container_rect.left
        })
      }
    }
  }, [props.active_tab])

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {props.tabs.map((tab, index) => (
          <button
            key={tab}
            ref={(el) => {
              tabs_ref.current[index] = el
            }}
            className={cn(styles.tabs__tab, {
              [styles['tabs__tab--active']]: props.active_tab == tab
            })}
            onClick={() => props.on_tab_click(tab)}
            data-text={tab}
          >
            {tab}
          </button>
        ))}
        <div
          className={styles.tabs__underline}
          style={{
            width: `${underline_style.width}px`,
            transform: `translateX(${underline_style.left}px)`
          }}
        />
      </div>
    </div>
  )
}
