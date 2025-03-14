import localforage from 'localforage'

export type StoredWebsite = {
  url: string
  title: string
  content: string
  favicon?: string // Base64 encoded favicon
  is_enabled: boolean
}

export type Website = {
  url: string
  title: string
  content: string
  favicon?: string // Base64 encoded favicon
  is_enabled?: boolean
}

// Initialize localforage instance for website data
const STORE_NAME = 'websites'
export const websites_store = localforage.createInstance({
  name: 'gemini-coder-connector',
  storeName: STORE_NAME
})

export const use_websites_store = () => {
  const store_website = async (website: Website) => {
    try {
      const stored_website: StoredWebsite = {
        url: website.url,
        title: website.title,
        content: website.content,
        favicon: website.favicon,
        is_enabled: !!website.is_enabled
      }
      await websites_store.setItem(website.url, stored_website)
      return true
    } catch (error) {
      console.error('Error storing website:', error)
      return false
    }
  }

  const toggle_website_enabled = async (
    url: string,
    is_enabled: boolean
  ): Promise<boolean> => {
    try {
      const website = await get_website(url)
      if (website) {
        website.is_enabled = is_enabled
        await websites_store.setItem(url, website)
        return true
      }
      return false
    } catch (error) {
      console.error('Error toggling website enabled state:', error)
      return false
    }
  }

  const get_website = async (url: string): Promise<StoredWebsite | null> => {
    try {
      const stored = await websites_store.getItem<StoredWebsite>(url)
      // Handle legacy websites that don't have is_enabled property
      if (stored && stored.is_enabled === undefined) {
        stored.is_enabled = true
      }
      return stored
    } catch (error) {
      console.error('Error getting website:', error)
      return null
    }
  }

  const get_all_websites = async (): Promise<StoredWebsite[]> => {
    const websites: StoredWebsite[] = []
    try {
      await websites_store.iterate<StoredWebsite, void>((value) => {
        // Handle legacy websites that don't have is_enabled property
        if (value.is_enabled === undefined) {
          value.is_enabled = true
        }
        websites.push(value)
      })
      return websites
    } catch (error) {
      console.error('Error getting all websites:', error)
      return []
    }
  }

  const delete_website = async (url: string): Promise<boolean> => {
    try {
      await websites_store.removeItem(url)
      return true
    } catch (error) {
      console.error('Error deleting website:', error)
      return false
    }
  }

  return {
    store_website,
    get_website,
    get_all_websites,
    delete_website,
    toggle_website_enabled
  }
}
