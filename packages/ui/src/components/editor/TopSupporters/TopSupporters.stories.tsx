import { TopSupporters } from './TopSupporters'

export default {
  component: TopSupporters
}

export const Default = () => {
  return (
    <div style={{ maxWidth: '300px' }}>
      <TopSupporters
        heading="Top Supporters"
        top_supporters={[
          { name: 'Alice' },
          { name: 'Bob' },
          { name: 'Charlie' },
          { name: 'David' },
          { name: 'Eve' },
          { name: 'Frank' }
        ]}
      />
    </div>
  )
}
