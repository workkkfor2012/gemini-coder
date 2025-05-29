import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import styles from './RecentDonations.module.scss'

dayjs.extend(relativeTime)

type Props = {
  donations: { name: string; note?: string; date: Date }[]
}

export const RecentDonations: React.FC<Props> = (props) => {
  return (
    <div className={styles.list}>
      {props.donations.map((coffee, i) => {
        const relative_time = dayjs(coffee.date).fromNow()
        return (
          <div key={i} className={styles.list__item}>
            <div
              className={styles.list__item__heading}
              title={`${coffee.name} donated ${relative_time}`}
            >
              <span className={styles.list__item__heading__username}>
                {coffee.name}
              </span>
              <span>donated {relative_time}</span>
            </div>

            {coffee.note && (
              <div className={styles.list__item__note}>{coffee.note}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
