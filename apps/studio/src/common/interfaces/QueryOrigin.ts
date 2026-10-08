export type QueryOrigin = 'app' | 'plugin'

export type QueryOriginFilter =
  | QueryOrigin
  | 'bks-ai-shell'
  | 'bks-er-diagram'

export const QUERY_ORIGIN_OPTIONS: ReadonlyArray<{
  value: QueryOriginFilter
  origin: QueryOrigin
  pluginId?: string
  label: string
  icon: string
}> = [
  {
    value: 'app',
    origin: 'app',
    label: 'App',
    icon: 'code'
  },
  {
    value: 'bks-ai-shell',
    origin: 'plugin',
    pluginId: 'bks-ai-shell',
    label: 'AI Shell',
    icon: 'auto_awesome'
  },
  {
    value: 'bks-er-diagram',
    origin: 'plugin',
    pluginId: 'bks-er-diagram',
    label: 'ER Diagram',
    icon: 'account_tree'
  },
  {
    value: 'plugin',
    origin: 'plugin',
    label: 'Plugin',
    icon: 'extension'
  }
]
