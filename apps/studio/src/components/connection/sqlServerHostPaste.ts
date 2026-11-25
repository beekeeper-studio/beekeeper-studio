import { applySqlServerHostPaste } from '@/lib/db/clients/sqlserverHost'

// Paste handler for a SQL Server Host input. SSMS, sqlcmd and the Azure portal hand out
// `host,port` (often `tcp:host,port`); the port belongs in the Port field, so a pasted value
// is split across the two. Other connection types, and pastes without a port, are untouched.
export function handleSqlServerHostPaste(event: ClipboardEvent, config: any): boolean {
  if (config?.connectionType !== 'sqlserver') return false
  const input = event.target as HTMLInputElement
  if (!input || input.readOnly || input.disabled) return false

  const pasted = event.clipboardData?.getData('text') || ''
  const current = input.value || ''
  const start = input.selectionStart ?? current.length
  const end = input.selectionEnd ?? current.length
  const result = applySqlServerHostPaste(current, start, end, pasted)
  if (!result) return false

  event.preventDefault()
  config.host = result.host
  config.port = result.port
  return true
}
