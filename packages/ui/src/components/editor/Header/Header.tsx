import styles from './Header.module.scss'
import cn from 'classnames'

type Props = {
  active_tab: 'home' | 'settings' | 'donations'
  on_home_tab_click: () => void
  on_donations_tab_click: () => void
  on_settings_tab_click: () => void
}

export const Header: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'home'
          })}
          onClick={props.on_home_tab_click}
          data-text="Home"
        >
          Home
        </button>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'settings'
          })}
          onClick={props.on_settings_tab_click}
          data-text="Settings"
        >
          Settings
        </button>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'donations'
          })}
          onClick={props.on_donations_tab_click}
          data-text="Donations"
        >
          Donations
        </button>
      </div>
    </div>
  )
}
