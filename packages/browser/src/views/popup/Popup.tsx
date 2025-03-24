import React, { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'
import { HtmlParser } from '../../utils/html-parser'
import { StoredWebsite, use_websites_store } from './hooks/use-websites-store'
import { SavedWebsites } from '@ui/components/browser/SavedWebsites'
import { WebsiteActions } from '@ui/components/browser/WebsiteActions'

export const Popup: React.FC = () => {
  const [current_url, set_current_url] = useState<string>('')
  const [page_title, set_page_title] = useState<string>('')
  const [parsed_html, set_parsed_html] =
    useState<HtmlParser.ParsedResult | null>(null)
  const [is_loading, set_is_loading] = useState<boolean>(true)
  const [saved_websites, set_saved_websites] = useState<StoredWebsite[]>([])
  const [is_saved, set_is_saved] = useState<boolean>(false)
  const [favicon, set_favicon] = useState<string>('')
  const [is_selection, set_is_selection] = useState<boolean>(false)

  const websites_store_hook = use_websites_store()

  useEffect(() => {
    // Load saved websites
    load_saved_websites()

    // Get current tab
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(async ([tab]) => {
        if (tab && tab.url && tab.title) {
          set_current_url(tab.url)
          set_page_title(tab.title)

          // Check if this page is already saved
          const saved = await websites_store_hook.get_website(tab.url)
          if (saved) {
            set_is_saved(true)
          }

          // Request parsed HTML
          if (tab.id) {
            browser.tabs
              .sendMessage(tab.id, {
                action: 'get-page-data'
              })
              .catch((error) => {
                console.error('Error sending message to tab:', error)
                set_is_loading(false)
              })
          }
        } else {
          set_is_loading(false)
        }
      })

    // Listen for parsed HTML response
    const message_listener = (message: any) => {
      if (message && message.action === 'page-data') {
        set_parsed_html(message.parsed_html)
        if (message.favicon) {
          set_favicon(message.favicon)
        }
        if (message.is_selection) {
          set_is_selection(true)
        }
        set_is_loading(false)
      }
    }

    browser.runtime.onMessage.addListener(message_listener as any)

    return () => {
      browser.runtime.onMessage.removeListener(message_listener as any)
    }
  }, [])

  const load_saved_websites = async () => {
    const websites = await websites_store_hook.get_all_websites()
    set_saved_websites(websites)
  }

  const save_current_page = async () => {
    if (parsed_html && current_url && page_title) {
      const success = await websites_store_hook.store_website({
        url: current_url,
        title: page_title,
        content: parsed_html.content,
        favicon,
        is_selection
      })

      if (success) {
        set_is_saved(true)
        await load_saved_websites()
      }
    }
  }

  const remove_saved_page = async (url: string) => {
    const success = await websites_store_hook.delete_website(url)
    if (success) {
      if (url == current_url) {
        set_is_saved(false)
      }
      await load_saved_websites()
    }
  }

  const open_website_in_new_tab = (url: string) => {
    browser.tabs.create({ url, active: false })
  }

  return (
    <div>
      <SavedWebsites
        websites={saved_websites}
        on_delete={remove_saved_page}
        on_link_click={open_website_in_new_tab}
      />

      <WebsiteActions
        is_loading={is_loading}
        parsed_html={!!parsed_html}
        is_saved={is_saved}
        on_save={save_current_page}
        on_remove={() => remove_saved_page(current_url)}
      />
    </div>
  )
}
