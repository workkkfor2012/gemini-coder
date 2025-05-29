import { RecentDonations } from './RecentDonations'

export default {
  component: RecentDonations
}

export const Default = () => {
  const now = new Date()
  const two_days_ago = new Date(now)
  two_days_ago.setDate(now.getDate() - 2)
  const one_hour_ago = new Date(now)
  one_hour_ago.setHours(now.getHours() - 1)

  return (
    <div style={{ maxWidth: '300px' }}>
      <RecentDonations
        donations={[
          {
            name: 'Alice',
            note: 'First donor!',
            date: two_days_ago
          },
          {
            name: 'Bob',
            note: 'Thanks!',
            date: one_hour_ago
          },
          {
            name: 'Charlie',
            note: 'Keep up the good work!',
            date: now
          }
        ]}
      />
    </div>
  )
}
