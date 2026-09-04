export type QueryOrigin = 'app' | 'plugin'

export const QUERY_ORIGIN_OPTIONS: ReadonlyArray<{
  value: QueryOrigin
  label: string
  icon: string
}> = [
  { value: 'app', label: 'App', icon: 'code' },
  { value: 'plugin', label: 'Plugin', icon: 'extension' }
]
