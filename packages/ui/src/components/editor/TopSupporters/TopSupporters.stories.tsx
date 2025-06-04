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
          'Supporter 1',
          'Another Supporter',
          'Great! https://example.com',
          'alice@gmail.com'
        ]}
      />
    </div>
  )
}
