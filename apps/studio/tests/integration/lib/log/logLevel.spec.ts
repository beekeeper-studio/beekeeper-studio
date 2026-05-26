import { resolveLogLevels, resolveLogLevelsFromProcessEnv } from '@/lib/log/logLevel'

describe('resolveLogLevels', () => {
  it('returns warn/warn in production', () => {
    expect(resolveLogLevels({ isDevelopment: false })).toEqual({ file: 'warn', console: 'warn' })
  })

  it('returns silly/info in development', () => {
    expect(resolveLogLevels({ isDevelopment: true })).toEqual({ file: 'silly', console: 'info' })
  })

  it('returns silly/info when debugFlag is set in production', () => {
    expect(resolveLogLevels({ isDevelopment: false, debugFlag: true })).toEqual({ file: 'silly', console: 'info' })
  })

  it('honours an override in both transports', () => {
    expect(resolveLogLevels({ isDevelopment: false, override: 'debug' })).toEqual({ file: 'debug', console: 'debug' })
  })

  it('override is case-insensitive', () => {
    expect(resolveLogLevels({ isDevelopment: false, override: 'INFO' })).toEqual({ file: 'info', console: 'info' })
  })

  it('falls back to defaults when override is invalid', () => {
    expect(resolveLogLevels({ isDevelopment: false, override: 'screamloudly' })).toEqual({ file: 'warn', console: 'warn' })
  })

  it('override beats debugFlag', () => {
    expect(resolveLogLevels({ isDevelopment: false, override: 'error', debugFlag: true })).toEqual({ file: 'error', console: 'error' })
  })
})

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

describe('resolveLogLevelsFromProcessEnv', () => {
  it('reads NODE_ENV/BKS_LOG_LEVEL/DEBUG from process.env', () => {
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: 'verbose', DEBUG: undefined }, () => {
      expect(resolveLogLevelsFromProcessEnv()).toEqual({ file: 'verbose', console: 'verbose' })
    })
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: '1' }, () => {
      expect(resolveLogLevelsFromProcessEnv()).toEqual({ file: 'silly', console: 'info' })
    })
    withEnv({ NODE_ENV: 'production', BKS_LOG_LEVEL: undefined, DEBUG: undefined }, () => {
      expect(resolveLogLevelsFromProcessEnv()).toEqual({ file: 'warn', console: 'warn' })
    })
  })
})
