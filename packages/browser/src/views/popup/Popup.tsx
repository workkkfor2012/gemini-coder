import React, { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'
import { HtmlParser } from '../../utils/html-parser'
import { StoredWebsite, use_websites_store } from './hooks/use-websites-store'
import { SavedWebsites } from '@ui/components/browser/SavedWebsites'

export const Popup: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [pageTitle, setPageTitle] = useState<string>('')
  const [parsedHtml, setParsedHtml] = useState<HtmlParser.ParsedResult | null>(
    null
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [savedWebsites, setSavedWebsites] = useState<StoredWebsite[]>([])
  const [isSaved, setIsSaved] = useState<boolean>(false)
  const [activeWebsite, setActiveWebsite] = useState<StoredWebsite | null>(null)
  const [favicon, setFavicon] = useState<string>('')

  const { store_website, get_website, get_all_websites, delete_website } =
    use_websites_store()

  useEffect(() => {
    // Load saved websites
    loadSavedWebsites()

    // Get current tab
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(async ([tab]) => {
        if (tab && tab.url && tab.title) {
          setCurrentUrl(tab.url)
          setPageTitle(tab.title)

          // Check if this page is already saved
          const saved = await get_website(tab.url)
          if (saved) {
            setIsSaved(true)
            if (saved.favicon) {
              setFavicon(saved.favicon)
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
                setIsLoading(false)
              })
          }
        } else {
          setIsLoading(false)
        }
      })

    // Listen for parsed HTML response
    const messageListener = (message: any) => {
      if (message && message.action === 'parsed-html') {
        setParsedHtml(message.parsed_html)
        if (message.favicon) {
          setFavicon(message.favicon)
        }
        setIsLoading(false)
      }
    }

    browser.runtime.onMessage.addListener(messageListener as any)

    return () => {
      browser.runtime.onMessage.removeListener(messageListener as any)
    }
  }, [])

  const loadSavedWebsites = async () => {
    const websites = await get_all_websites()
    setSavedWebsites(websites)
  }

  const saveCurrentPage = async () => {
    if (parsedHtml && currentUrl && pageTitle) {
      const success = await store_website({
        url: currentUrl,
        title: pageTitle,
        content: parsedHtml.content,
        favicon: favicon
      })

      if (success) {
        setIsSaved(true)
        await loadSavedWebsites()
      }
    }
  }

  const removeSavedPage = async (url: string) => {
    const success = await delete_website(url)
    if (success) {
      if (url === currentUrl) {
        setIsSaved(false)
      }
      if (activeWebsite && activeWebsite.url === url) {
        setActiveWebsite(null)
      }
      await loadSavedWebsites()
    }
  }

  const viewSavedPage = (website: StoredWebsite) => {
    setActiveWebsite(website)
  }

  const backToCurrentPage = () => {
    setActiveWebsite(null)
  }

  return (
    <div className="popup-container">
      <h1>Gemini Coder Connector</h1>

      {/* Saved websites list using the SavedWebsites component */}
      {savedWebsites.length > 0 && (
        <div className="saved-websites">
          <h2>Saved Pages</h2>
          <SavedWebsites
            websites={savedWebsites}
            on_view={viewSavedPage}
            on_delete={removeSavedPage}
          />
        </div>
      )}

      {activeWebsite ? (
        <div className="viewed-website">
          <div className="back-button-container">
            <button onClick={backToCurrentPage} className="back-button">
              ← Back to current page
            </button>
          </div>
          <div className="page-info">
            <div className="title-with-favicon">
              {activeWebsite.favicon && (
                <img src={activeWebsite.favicon} className="favicon" alt="" />
              )}
              <h2>{activeWebsite.title}</h2>
            </div>
            <p className="url">{activeWebsite.url}</p>
          </div>
          <div className="parsed-content">
            <div className="actions">
              {!isSaved ? (
                <button onClick={saveCurrentPage} className="save-button">
                  Save Page
                </button>
              ) : (
                <button
                  onClick={() => removeSavedPage(currentUrl)}
                  className="delete-button"
                >
                  Remove Save
                </button>
              )}
            </div>
            <div className="content-preview">
              {activeWebsite.content.substring(0, 200)}
              {activeWebsite.content.length > 200 ? '...' : ''}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {isLoading ? (
            <p>Loading page content...</p>
          ) : (
            <div>
              <div className="page-info">
                <div className="title-with-favicon">
                  {favicon && <img src={favicon} className="favicon" alt="" />}
                  <h2>{pageTitle}</h2>
                </div>
                <p className="url">{currentUrl}</p>
              </div>

              {parsedHtml ? (
                <div className="parsed-content">
                  <div className="actions">
                    {!isSaved ? (
                      <button onClick={saveCurrentPage} className="save-button">
                        Save Page
                      </button>
                    ) : (
                      <button
                        onClick={() => removeSavedPage(currentUrl)}
                        className="delete-button"
                      >
                        Remove Save
                      </button>
                    )}
                  </div>
                  <div className="content-preview">
                    {parsedHtml.content.substring(0, 200)}
                    {parsedHtml.content.length > 200 ? '...' : ''}
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
