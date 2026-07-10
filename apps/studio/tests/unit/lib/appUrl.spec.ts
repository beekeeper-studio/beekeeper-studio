import { isAppUrl, parseAppUrl } from '@/lib/appUrl'

describe('appUrl', () => {
  describe('isAppUrl', () => {
    it('detects beekeeperstudio urls', () => {
      expect(isAppUrl('beekeeperstudio://cloud/signin?code=abc')).toBe(true)
      expect(isAppUrl('BeekeeperStudio://cloud/signin?code=abc')).toBe(true)
    })

    it('rejects database and other urls', () => {
      expect(isAppUrl('postgres://localhost/mydb')).toBe(false)
      expect(isAppUrl('https://app.beekeeperstudio.io')).toBe(false)
      expect(isAppUrl('')).toBe(false)
      expect(isAppUrl(undefined)).toBe(false)
    })
  })

  describe('parseAppUrl', () => {
    it('parses a cloud sign-in url', () => {
      const action = parseAppUrl('beekeeperstudio://cloud/signin?code=abc123&email=user%40example.com&workspace_id=42')
      expect(action).toEqual({
        type: 'cloud-signin',
        code: 'abc123',
        email: 'user@example.com',
        workspaceId: 42,
      })
    })

    it('parses a minimal cloud sign-in url', () => {
      const action = parseAppUrl('beekeeperstudio://cloud/signin?code=abc123')
      expect(action).toEqual({
        type: 'cloud-signin',
        code: 'abc123',
        email: undefined,
        workspaceId: undefined,
      })
    })

    it('handles a trailing slash and junk workspace ids', () => {
      const action = parseAppUrl('beekeeperstudio://cloud/signin/?code=abc123&workspace_id=banana')
      expect(action).toMatchObject({ type: 'cloud-signin', code: 'abc123', workspaceId: undefined })
    })

    it('returns null without a code', () => {
      expect(parseAppUrl('beekeeperstudio://cloud/signin')).toBeNull()
    })

    it('returns null for unknown actions', () => {
      expect(parseAppUrl('beekeeperstudio://something/else?code=abc')).toBeNull()
    })

    it('returns null for non-app urls', () => {
      expect(parseAppUrl('postgres://localhost/mydb')).toBeNull()
      expect(parseAppUrl(undefined)).toBeNull()
    })
  })
})
