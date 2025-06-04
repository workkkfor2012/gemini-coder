import styles from './TopSupporters.module.scss'

type Props = {
  top_supporters: string[]
  heading: string
}

const normalizeUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`
  }
  return url
}

const url_pattern =
  /((?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9](?:\/[^\s()<>]*)*)/gi

const render_supporter_name = (name: string): (string | JSX.Element)[] => {
  if (name.includes('@')) {
    return [name]
  }

  const parts = name.split(url_pattern)

  return parts.map((part, index) => {
    if (index % 2 == 1 && part) {
      const exact_url_pattern = new RegExp(`^${url_pattern.source}$`, 'i')
      if (exact_url_pattern.test(part)) {
        return (
          <a key={index} href={normalizeUrl(part)}>
            {part}
          </a>
        )
      }
    }
    return part
  })
}

export const TopSupporters: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div>{props.heading}</div>
      <div className={styles.supporters}>
        {props.top_supporters.slice(0, 3).map((name, i) => (
          <div key={i} className={styles.supporter}>
            <div
              className={`${styles.rank} ${
                i == 0
                  ? styles.rank__gold
                  : i == 1
                  ? styles.rank__silver
                  : styles.rank__bronze
              }`}
            >
              {i + 1}
            </div>
            <div>{render_supporter_name(name)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
