import styles from './Template.module.scss'

namespace Template {
  export type Props = {
    overlay_slot?: React.ReactNode
    base_slot: React.ReactNode
  }
}

export const Template: React.FC<Template.Props> = (props) => {
  return (
    <div className={styles.container}>
      {props.overlay_slot && (
        <div className={styles.slot}>{props.overlay_slot}</div>
      )}
      <div className={styles.slot}>{props.base_slot}</div>
    </div>
  )
}
