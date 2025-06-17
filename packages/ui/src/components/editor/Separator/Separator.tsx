import styles from './Separator.module.scss'
import cn from 'classnames'

export namespace Separator {
  export type Props = {
    size: 'small' | 'medium' | 'large' | 10 | 24
  }
}

export const Separator: React.FC<Separator.Props> = (props) => {
  return (
    <div
      className={cn(styles.separator, {
        [styles['separator--small']]: props.size == 'small',
        [styles['separator--medium']]: props.size == 'medium',
        [styles['separator--large']]: props.size == 'large',
        [styles['separator--10']]: props.size == 10,
        [styles['separator--24']]: props.size == 24
      })}
    />
  )
}
