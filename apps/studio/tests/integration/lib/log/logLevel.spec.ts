import { resolveLevel } from '@/lib/log/logLevel'

describe('resolveLevel', () => {
  it('defaults to warn in production', () => {
    expect(resolveLevel({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: undefined })).toBe('warn')
  })

  it('returns silly in development', () => {
    expect(resolveLevel({ NODE_ENV: 'development', BKS_LOG_LEVEL: undefined, DEBUG: undefined })).toBe('silly')
  })

  it('returns silly when DEBUG is set in production', () => {
    expect(resolveLevel({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: '1' })).toBe('silly')
  })

  it('honours BKS_LOG_LEVEL override', () => {
    expect(resolveLevel({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'debug', DEBUG: undefined })).toBe('debug')
  })

  it('override is case-insensitive', () => {
    expect(resolveLevel({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'INFO', DEBUG: undefined })).toBe('info')
  })

  it('falls back to defaults when override is invalid', () => {
      expect(resolveLevel({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'screamloudly', DEBUG: undefined })).toBe('warn')
  })

  it('override beats DEBUG flag', () => {
    expect(resolveLevel({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'error', DEBUG: '1' })).toBe('error')
  })
})
