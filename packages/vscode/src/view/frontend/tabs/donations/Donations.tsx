import { RecentDonations as UiRecentDonations } from '@ui/components/editor/RecentDonations'
import styles from './Donations.module.scss'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { BuyMeACoffee as UiBuyMeACoffee } from '@ui/components/editor/BuyMeACoffee'
import { useEffect } from 'react'
import { use_donations } from './hooks/use-donations'
import { use_infinite_scroll } from './hooks/use-infinite-scroll'
import SimpleBar from 'simplebar-react'

type Props = {
  vscode: any
  is_visible: boolean
}

export const Donations: React.FC<Props> = (props) => {
  const {
    donations,
    is_loading,
    is_loading_more,
    is_initialized,
    error,
    has_more,
    load_more
  } = use_donations(props.is_visible)

  const container_ref = use_infinite_scroll({
    load_more,
    has_more,
    is_loading: is_loading_more
  })

  useEffect(() => {
    if (container_ref.current) {
      container_ref.current.scrollTop = 0
    }
  }, [props.is_visible])

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <SimpleBar
        style={{
          height: '100%'
        }}
        scrollableNodeProps={{ ref: container_ref }}
      >
        <div className={styles.inner}>
          <div className={styles.top}>
            <div className={styles.top__intro}>
              <span>
                Hi there! CWC is a work aimed at making high-quality AI-assisted
                coding tools freely available to everyone. If you&apos;d like to
                show your support, you can &quot;buy me a coffee&quot; or send a{' '}
                <a href="https://codeweb.chat/#donations">cryptocurrency</a>{' '}
                tip.
              </span>
              <span>Thank you for choosing to donate ♥</span>
            </div>
            <div className={styles.top__button}>
              <UiBuyMeACoffee username="robertpiosik" />
              <span>$1 or more</span>
            </div>
          </div>

          <UiSeparator height={16} />

          {!is_initialized ? (
            <>Fetching recent donations...</>
          ) : error ? (
            error
          ) : (
            <div className={styles['recent-donations']}>
              <span>RECENT DONATIONS</span>
              <div className={is_loading ? styles.dimmed : ''}>
                <UiRecentDonations donations={donations} />
              </div>
              {is_loading_more && (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  Loading more donations...
                </div>
              )}
              {!has_more && donations.length > 0 && (
                <div
                  style={{ textAlign: 'center', padding: '1rem', opacity: 0.7 }}
                >
                  No more donations to load
                </div>
              )}
            </div>
          )}
        </div>
      </SimpleBar>
    </div>
  )
}
