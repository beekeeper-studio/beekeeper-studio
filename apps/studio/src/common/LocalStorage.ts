import _ from 'lodash'

export const SmartLocalStorage = {
  addItem(key:string, value:any): void{
    localStorage.setItem(key, JSON.stringify(value))
  },
  getItem(key:string, defaultVal: any = null): any{
    const value = localStorage.getItem(key)
    if (value === null) return defaultVal
    return value
  },
  getJSON(key: string, fallback?: any): any {
    const item = localStorage.getItem(key)
    if (!item) return fallback
    try {
      return JSON.parse(item)
    } catch {
      return fallback
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(key)
  },
  setBool(key: string, value: boolean): void {
    localStorage.setItem(key, JSON.stringify(value))
  },
  getBool(key: string, defaultVal = false): boolean {
    const result = localStorage.getItem(key)
    if (_.isNil(result)) return defaultVal
    return result === "true"
  },
  getDate(key: string): Date | null {
    const item = localStorage.getItem(key)
    if (!item) return null
    try {
      return new Date(parseInt(item))
    } catch {
      return null
    }
  },
  setDate(key: string, d: Date): void {
    localStorage.setItem(key, d.getTime().toString())
  },
  getWithExpiry(key: string): any {
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
  setWithExpiry(key: string, value: any, ttl: number): void {
    const now = new Date()

    // `item` is an object which contains the original value
    // as well as the time when it's supposed to expire
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
      }
    localStorage.setItem(key, JSON.stringify(item))
  },
  /** Returns `true` if the key exists */
  exists(key: string) {
    return localStorage.getItem(key) != null;
  },
  remove(key: string) {
    localStorage.removeItem(key);
  },

}
