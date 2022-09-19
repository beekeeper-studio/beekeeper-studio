

export const SmartLocalStorage = {
  ...localStorage,
  getDate(key: string): Date | null {
    const item = localStorage.getItem(key)
    if (!item) return null
    try {
      return new Date(parseInt(item))
    } catch {
      return null
    }
  },
  setDate(key: string, d: Date) {
    localStorage.setItem(key, d.getTime().toString())
  },
  getWithExpiry(key) {
    const itemStr = localStorage.getItem(key)
    // if the item doesn't exist, return null
    if (!itemStr) {
      return null
    }
    const item = JSON.parse(itemStr)
    const now = new Date()
    // compare the expiry time of the item with the current time
    if (now.getTime() > item.expiry) {
      // If the item is expired, delete the item from storage
      // and return null
      localStorage.removeItem(key)
      return null
    }
    return item.value
  },
  setWithExpiry(key, value, ttl) {
    const now = new Date()

    // `item` is an object which contains the original value
    // as well as the time when it's supposed to expire
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
      }
    localStorage.setItem(key, JSON.stringify(item))
  }

}