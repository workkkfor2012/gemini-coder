import { RecentDonations as UiRecentDonations } from '@ui/components/editor/RecentDonations'
import styles from './Donations.module.scss'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { BuyMeACoffee as UiBuyMeACoffee } from '@ui/components/editor/BuyMeACoffee'
import { TopSupporters as UiTopSupporters } from '@ui/components/editor/TopSupporters'
import { useEffect, useState } from 'react'
import { Logger } from '@/helpers/logger'
import cn from 'classnames'
import { useRef } from 'react'

type Props = {
  vscode: any
  is_visible: boolean
}

export const Donations: React.FC<Props> = (props) => {
  const container_ref = useRef<HTMLDivElement>(null)
  const [donations, set_donations] = useState<
    { name: string; date: Date; note?: string }[]
  >([])
  const [top_supporters, set_top_supporters] = useState<{ name: string }[]>([])
  const [is_loading, set_is_loading] = useState(false)
  const [is_initialized, set_is_initialized] = useState(false)
  const [error, set_error] = useState<string | null>(null)

  useEffect(() => {
    container_ref.current!.scrollTop = 0

    if (props.is_visible && !is_loading) {
      fetch_all_data()
    }
  }, [props.is_visible])

  const fetch_all_data = async () => {
    set_is_loading(true)
    set_error(null)
    try {
      const [coffees_response, supporters_response] = await Promise.all([
        fetch(
          'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?page=1&per_page=20'
        ),
        fetch(
          'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/top-supporters'
        )
      ])

      if (!coffees_response.ok) {
        throw new Error('Failed to fetch donations')
      }
      if (!supporters_response.ok) {
        throw new Error('Failed to fetch top supporters')
      }

      const coffees_data = await coffees_response.json()
      const supporters_data = await supporters_response.json()

      set_top_supporters(
        supporters_data.data.map((supporter: any) => ({
          name: supporter.profile_full_name
        }))
      )

      set_donations(
        coffees_data.data.map((coffee: any) => ({
          name: coffee.supporter_name,
          note: coffee.support_note,
          date: new Date(coffee.support_created_on)
        }))
      )

      set_is_initialized(true)
    } catch (err) {
      set_error('Failed to fetch data. Please try again later.')
      Logger.error({
        function_name: 'fetch_all_data',
        message: 'Error fetching data:',
        data: err
      })
    } finally {
      set_is_loading(false)
    }
  }

  return (
    <div
      ref={container_ref}
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <span>
        CWC is a work of an independent developer aimed at making cost
        effective, top-accuracy AI coding tools freely available to everyone.
      </span>

      <UiSeparator size="large" />

      <UiBuyMeACoffee username="robertpiosik" />

      <UiSeparator size="large" />

      {is_loading && !is_initialized ? (
        <>Fetching data...</>
      ) : error ? (
        error
      ) : (
        <>
          <div
            className={cn(styles['top-supporters'], {
              [styles['top-supporters--loading']]: is_loading
            })}
          >
            <UiTopSupporters
              top_supporters={top_supporters}
              heading="Top supporters from the last 90 days"
            />
          </div>

          <UiSeparator size="large" />

          <div
            className={cn(styles['recent-donations'], {
              [styles['recent-donations--loading']]: is_loading
            })}
          >
            <UiRecentDonations donations={donations} />
          </div>
        </>
      )}
    </div>
  )
}
