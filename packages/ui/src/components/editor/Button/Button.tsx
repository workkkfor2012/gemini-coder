import { FC } from 'react'
import styles from './Button.module.scss'
import cn from 'classnames'

type Props = {
  on_click: () => void
  disabled?: boolean
  children?: React.ReactNode
  codicon?: string
  title?: string
  on_quick_pick_trigger_click?: () => void
}

export const Button: FC<Props> = (props) => {
  return props.on_quick_pick_trigger_click ? (
    <div className={styles['with-quick-pick-trigger']}>
      <button
        className={styles.button}
        onClick={props.on_click}
        disabled={props.disabled}
        title={props.title}
      >
        {props.codicon && (
          <span className={cn('codicon', `codicon-${props.codicon}`)} />
        )}
        {props.children}
      </button>
      <div
        className={cn(styles['with-quick-pick-trigger__separator'], {
          [styles['with-quick-pick-trigger__separator--disabled']]:
            props.disabled
        })}
      ></div>
      <button
        className={styles.button}
        disabled={props.disabled}
        onClick={props.on_quick_pick_trigger_click}
      >
        <span className="codicon codicon-ellipsis" />
      </button>
    </div>
  ) : (
    <button
      className={styles.button}
      onClick={props.on_click}
      disabled={props.disabled}
      title={props.title}
    >
      {props.codicon && (
        <span className={cn('codicon', `codicon-${props.codicon}`)} />
      )}
      {props.children}
    </button>
  )
}
