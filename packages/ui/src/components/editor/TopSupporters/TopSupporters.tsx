import styles from './TopSupporters.module.scss'

type Props = {
  top_supporters: { name: string }[]
  heading: string
}

const normalizeUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`
  }
  return url
}

const urlPattern =
  /((?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9](?:\/[^\s()<>]*)*)/gi

const render_supporter_name = (name: string): (string | JSX.Element)[] => {
  if (name.includes('@')) {
    return [name]
  }

  const parts = name.split(urlPattern)

  return parts.map((part, index) => {
    if (index % 2 === 1 && part) {
      const exactUrlPattern = new RegExp(`^${urlPattern.source}$`, 'i')
      if (exactUrlPattern.test(part)) {
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
      <div className={styles.heading}>{props.heading}</div>
      <div className={styles.supporters}>
        {props.top_supporters.map((supporter, i) => (
          <div key={i}>{render_supporter_name(supporter.name)}</div>
        ))}
      </div>
    </div>
  )
}
