import React, { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'
import { HtmlParser } from '../../utils/html-parser'
import { StoredWebsite, use_websites_store } from './hooks/use-websites-store'
import { SavedWebsites } from '@ui/components/browser/SavedWebsites'

export const Popup: React.FC = () => {
  const [current_url, set_current_url] = useState<string>('')
  const [page_title, set_page_title] = useState<string>('')
  const [parsed_html, set_parsed_html] = useState<HtmlParser.ParsedResult | null>(
    null
  )
  const [is_loading, set_is_loading] = useState<boolean>(true)
  const [saved_websites, set_saved_websites] = useState<StoredWebsite[]>([])
  const [is_saved, set_is_saved] = useState<boolean>(false)
  const [active_website, set_active_website] = useState<StoredWebsite | null>(null)
  const [favicon, set_favicon] = useState<string>('')

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
            if (saved.favicon) {
              set_favicon(saved.favicon)
            }
          }

          // Request parsed HTML
          if (tab.id) {
            browser.tabs
              .sendMessage(tab.id, {
                action: 'get-parsed-html'
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
      if (message && message.action === 'parsed-html') {
        set_parsed_html(message.parsed_html)
        if (message.favicon) {
          set_favicon(message.favicon)
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
        favicon: favicon,
        is_enabled: true
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
      if (url === current_url) {
        set_is_saved(false)
      }
      if (active_website && active_website.url === url) {
        set_active_website(null)
      }
      await load_saved_websites()
    }
  }

  const toggle_website_enabled_handler = async (url: string, is_enabled: boolean) => {
    const success = await websites_store_hook.toggle_website_enabled(url, is_enabled)
    if (success) {
      await load_saved_websites()
      if (active_website && active_website.url === url) {
        set_active_website({
          ...active_website,
          is_enabled: is_enabled
        })
      }
    }
  }

  const open_website_in_new_tab = (url: string) => {
    browser.tabs.create({ url, active: false })
  }

  const back_to_current_page = () => {
    set_active_website(null)
  }

  return (
    <div className="popup-container">
      <h1>Gemini Coder Connector</h1>

      {/* Saved websites list using the SavedWebsites component */}
      {saved_websites.length > 0 && (
        <div className="saved-websites">
          <h2>Saved Pages</h2>
          <SavedWebsites
            websites={saved_websites}
            on_delete={remove_saved_page}
            on_toggle_enabled={toggle_website_enabled_handler}
            on_link_click={open_website_in_new_tab}
          />
        </div>
      )}

      {active_website ? (
        <div className="viewed-website">
          <div className="back-button-container">
            <button onClick={back_to_current_page} className="back-button">
              ← Back to current page
            </button>
          </div>
          <div className="page-info">
            <div className="title-with-favicon">
              {active_website.favicon && (
                <img src={active_website.favicon} className="favicon" alt="" />
              )}
              <h2>{active_website.title}</h2>
            </div>
            <p className="url">{active_website.url}</p>
          </div>
          <div className="parsed-content">
            <div className="actions">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={active_website.is_enabled}
                  onChange={(e) =>
                    toggle_website_enabled_handler(active_website.url, e.target.checked)
                  }
                  className="toggle-input"
                />
                {active_website.is_enabled ? 'Enabled' : 'Disabled'}
              </label>
              <button
                onClick={() => remove_saved_page(active_website.url)}
                className="delete-button"
              >
                Remove Save
              </button>
            </div>
            <div className="content-preview">
              {active_website.content.substring(0, 200)}
              {active_website.content.length > 200 ? '...' : ''}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {is_loading ? (
            <p>Loading page content...</p>
          ) : (
            <div>
              <div className="page-info">
                <div className="title-with-favicon">
                  {favicon && <img src={favicon} className="favicon" alt="" />}
                  <h2>{page_title}</h2>
                </div>
                <p className="url">{current_url}</p>
              </div>

              {parsed_html ? (
                <div className="parsed-content">
                  <div className="actions">
                    {!is_saved ? (
                      <button onClick={save_current_page} className="save-button">
                        Save Page
                      </button>
                    ) : (
                      <button
                        onClick={() => remove_saved_page(current_url)}
                        className="delete-button"
                      >
                        Remove Save
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p>No content could be parsed from this page.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
