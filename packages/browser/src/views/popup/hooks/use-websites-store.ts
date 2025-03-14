import localforage from 'localforage'

export type StoredWebsite = {
  url: string
  title: string
  content: string
  favicon?: string // Base64 encoded favicon
  date: number // Adding a date to sort by most recently saved
}

export type Website = {
  url: string
  title: string
  content: string
  favicon?: string // Base64 encoded favicon
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
        date: Date.now()
      }
      await websites_store.setItem(website.url, stored_website)
      return true
    } catch (error) {
      console.error('Error storing website:', error)
      return false
    }
  }

  const get_website = async (url: string): Promise<StoredWebsite | null> => {
    try {
      const stored = await websites_store.getItem<StoredWebsite>(url)
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
        websites.push(value)
      })
      // Sort by most recently saved
      return websites.sort((a, b) => b.date - a.date)
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
    delete_website
  }
}
