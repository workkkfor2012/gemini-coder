import { Icon } from '../Icon'
import styles from './Header.module.scss'
import cn from 'classnames'

type Props = {
  active_tab: 'chat' | 'tools'
  on_chat_tab_click: () => void
  on_tools_tab_click: () => void
}

export const Header: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'chat'
          })}
          onClick={props.on_chat_tab_click}
          data-text="Chat"
        >
          Chat
        </button>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'tools'
          })}
          onClick={props.on_tools_tab_click}
          data-text={'Tools'}
        >
          Tools
        </button>
      </div>
      <div className={styles.right}>
        <a
          href="https://buymeacoffee.com/robertpiosik"
          className={styles.right__button}
          title="Thank you for choosing to support Gemini Coder"
        >
          <Icon variant="BUY_ME_A_COFFEE" />
        </a>
      </div>
    </div>
  )
}
