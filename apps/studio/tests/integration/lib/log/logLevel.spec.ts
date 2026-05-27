import { resolveLevel } from '@/lib/log/logLevel'

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const original: Record<string, string | undefined> = {}
  for (const key of Object.keys(env)) {
    original[key] = process.env[key]
    if (env[key] === undefined) delete process.env[key]
    else process.env[key] = env[key]
  }
  try {
    return fn()
  } finally {
    for (const key of Object.keys(original)) {
      const value = original[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

describe('resolveLevel', () => {
  it('defaults to warn in production', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: undefined }, () => {
      expect(resolveLevel()).toBe('warn')
    })
  })

  it('returns silly in development', () => {
    withEnv({ NODE_ENV: 'development', BKS_LOG_LEVEL: undefined, DEBUG: undefined }, () => {
      expect(resolveLevel()).toBe('silly')
    })
  })

  it('returns silly when DEBUG is set in production', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: '1' }, () => {
      expect(resolveLevel()).toBe('silly')
    })
  })

  it('honours BKS_LOG_LEVEL override', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'debug', DEBUG: undefined }, () => {
      expect(resolveLevel()).toBe('debug')
    })
  })

  it('override is case-insensitive', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'INFO', DEBUG: undefined }, () => {
      expect(resolveLevel()).toBe('info')
    })
  })

  it('falls back to defaults when override is invalid', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'screamloudly', DEBUG: undefined }, () => {
      expect(resolveLevel()).toBe('warn')
    })
  })

  it('override beats DEBUG flag', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'error', DEBUG: '1' }, () => {
      expect(resolveLevel()).toBe('error')
    })
  })
})
