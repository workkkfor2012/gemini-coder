import type { ReactNode } from 'react'
import clsx from 'clsx'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

type FeatureItem = {
  title: string
  description: ReactNode
}

const FeatureList: FeatureItem[] = [
  {
    title: 'Own the context',
    description: (
      <>
        You decide which files provide relevant context. Select only what
        matters for accurate and fast responses.
      </>
    )
  },
  {
    title: 'Web browser integration',
    description: (
      <>
        Hands-free chat initializations in AI Studio, Gemini, ChatGPT, Claude,
        GitHub Copilot, and more.
      </>
    )
  },
  {
    title: 'Powerful API features',
    description: (
      <>
        Use Fill-In-the-Middle (FIM) completions, refactor entire files, and apply
        AI-suggested changes with ease.
      </>
    )
  }
]

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
