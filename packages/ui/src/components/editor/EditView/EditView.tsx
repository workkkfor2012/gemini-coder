import styles from './EditView.module.scss'
import { IconButton } from '../IconButton/IconButton'
import SimpleBar from 'simplebar-react'

type Props = {
  on_back_click: () => void
  header_slot?: React.ReactNode
  children: React.ReactNode
}

export const EditView: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.header__back}>
          <IconButton
            codicon_icon="chevron-left"
            on_click={props.on_back_click}
            title="Return to previous screen"
          />
          <span>Back</span>
        </div>
        <div>{props.header_slot}</div>
      </div>
      <div className={styles.content}>
        <SimpleBar
          style={{
            height: '100%'
          }}
        >
          <div className={styles.content__inner}>{props.children}</div>
        </SimpleBar>
      </div>
    </div>
  )
}
