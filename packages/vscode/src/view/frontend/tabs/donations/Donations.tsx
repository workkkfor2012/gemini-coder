import { RecentDonations as UiRecentDonations } from '@ui/components/editor/RecentDonations'
import styles from './Donations.module.scss'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { BuyMeACoffee as UiBuyMeACoffee } from '@ui/components/editor/BuyMeACoffee'
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
  const [is_loading, set_is_loading] = useState(false)
  const [is_initialized, set_is_initialized] = useState(false)
  const [error, set_error] = useState<string | null>(null)

  useEffect(() => {
    container_ref.current!.scrollTop = 0

    if (props.is_visible && !is_loading) {
      fetch_donations()
    }
  }, [props.is_visible])

  const fetch_donations = async () => {
    set_is_loading(true)
    set_error(null)
    try {
      const response = await fetch(
        'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?page=1&per_page=20'
      )
      if (!response.ok) {
        throw new Error('Failed to fetch donations')
      }
      const data = await response.json()
      set_donations(
        data.data.map((coffee: any) => ({
          name: coffee.supporter_name,
          note: coffee.support_note,
          date: new Date(coffee.support_created_on)
        }))
      )
      set_is_initialized(true)
    } catch (err) {
      set_error('Failed to fetch donations. Please try again later.')
      Logger.error({
        function_name: 'fetch_donations',
        message: 'Error fetching donations:',
        data: err
      })
    } finally {
      set_is_loading(false)
    }
  }

  return (
    <div
      ref={container_ref}
      className={cn(styles.container, {
        [styles['container--visible']]: props.is_visible
      })}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      CWC is a work of an independent developer aimed on making top-tier AI
      coding tools freely available to everyone.
      <UiSeparator size="large" />
      <UiBuyMeACoffee username="robertpiosik" />
      <UiSeparator size="large" />
      {is_loading && !is_initialized ? (
        <>Fetching donations...</>
      ) : error ? (
        error
      ) : (
        <div
          className={cn(styles['recent-donations'], {
            [styles['recent-donations--loading']]: is_loading
          })}
        >
          <UiRecentDonations donations={donations} />
        </div>
      )}
    </div>
  )
}
