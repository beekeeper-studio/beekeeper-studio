// Decides whether text pasted into a connection form's Host field is more than a hostname,
// i.e. worth handing to the connection URL parser. Dependency-free so the renderer can
// answer synchronously, while the paste event can still be cancelled.
//
// A plain hostname, an IP address, or `host\instance` is NOT one of these: it pastes as
// ordinary text, wherever the cursor is.

const HOST_AND_PORT = /^[^\s:/@\\,[\]]+:\d{1,5}$/
const BRACKETED_IPV6_AND_PORT = /^\[[0-9a-f:.%]+\]:\d{1,5}$/i

export function looksLikeConnectionPaste(raw: string): boolean {
  const text = (raw || '').trim()
  if (!text || /\s/.test(text)) return false
  if (text.includes('://')) return true
  if (text.includes('@')) return true
  return HOST_AND_PORT.test(text) || BRACKETED_IPV6_AND_PORT.test(text)
}

// The fields a paste into Host may fill. Connection type is deliberately absent: the form
// is already for one database, and switching type resets a blank connection.
export const HOST_PASTE_FIELDS = ['host', 'port', 'username', 'password', 'defaultDatabase'] as const
