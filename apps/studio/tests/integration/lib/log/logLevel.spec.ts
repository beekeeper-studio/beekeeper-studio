import { resolveLogLevels } from '@/lib/log/logLevel'

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

describe('resolveLogLevels', () => {
  it('returns warn/warn for production builds', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: undefined }, () => {
      expect(resolveLogLevels()).toEqual({ file: 'warn', console: 'warn' })
    })
  })

  it('returns silly/info for development builds', () => {
    withEnv({ NODE_ENV: 'development', BKS_LOG_LEVEL: undefined, DEBUG: undefined }, () => {
      expect(resolveLogLevels()).toEqual({ file: 'silly', console: 'info' })
    })
  })

  it('returns silly/info when DEBUG is set (legacy opt-in)', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: '*' }, () => {
      expect(resolveLogLevels()).toEqual({ file: 'silly', console: 'info' })
    })
  })

  it('honours BKS_LOG_LEVEL override in both transports', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'debug', DEBUG: undefined }, () => {
      expect(resolveLogLevels()).toEqual({ file: 'debug', console: 'debug' })
    })
  })

  it('BKS_LOG_LEVEL is case-insensitive', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'INFO', DEBUG: undefined }, () => {
      expect(resolveLogLevels()).toEqual({ file: 'info', console: 'info' })
    })
  })

  it('falls back to defaults when BKS_LOG_LEVEL is invalid', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'screamloudly', DEBUG: undefined }, () => {
      expect(resolveLogLevels()).toEqual({ file: 'warn', console: 'warn' })
    })
  })

  it('BKS_LOG_LEVEL beats DEBUG when both are set', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'error', DEBUG: '*' }, () => {
      expect(resolveLogLevels()).toEqual({ file: 'error', console: 'error' })
    })
  })
})
