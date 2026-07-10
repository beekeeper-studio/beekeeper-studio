// beekeeperstudio:// application URLs, registered with the OS as a custom
// protocol. These are app actions (e.g. cloud workspace sign-in), as opposed
// to the database connection URLs (postgres://, mysql://, ...) the app also
// accepts.

export const APP_URL_PROTOCOL = 'beekeeperstudio:'

export interface CloudSignInAction {
  type: 'cloud-signin'
  code: string
  email?: string
  workspaceId?: number
}

export type AppUrlAction = CloudSignInAction

export function isAppUrl(url?: string): boolean {
  return !!url && url.trim().toLowerCase().startsWith(`${APP_URL_PROTOCOL}//`)
}

// Returns the action for a beekeeperstudio:// url, or null when the url
// isn't one (or doesn't match a known action).
export function parseAppUrl(rawUrl?: string): AppUrlAction | null {
  if (!rawUrl || !isAppUrl(rawUrl)) return null

  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch (e) {
    return null
  }

  const route = `${url.host}${url.pathname}`.replace(/\/+$/, '')

  if (route === 'cloud/signin') {
    const code = url.searchParams.get('code')
    if (!code) return null
    const rawWorkspaceId = url.searchParams.get('workspace_id')
    const workspaceId = rawWorkspaceId ? parseInt(rawWorkspaceId, 10) : NaN
    return {
      type: 'cloud-signin',
      code,
      email: url.searchParams.get('email') || undefined,
      workspaceId: Number.isNaN(workspaceId) ? undefined : workspaceId,
    }
  }

  return null
}
