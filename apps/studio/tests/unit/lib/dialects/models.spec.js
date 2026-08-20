import { dialectFor, FormatterDialect } from "@shared/lib/dialects/models"
import { getDialectData } from "@shared/lib/dialects"
import { findClient } from "@/lib/db/clients"



describe("lib/models", () => {
  it("should properly identify formatter dialects", () => {
    const inputs = [
      ['postgresql', 'postgresql'],
      ['redshift', 'redshift'],
      ['foobar', 'mysql'],
      ['mysql', 'mysql'],
      ['sqlite', 'sqlite']
    ]

    inputs.forEach(([i, o]) => {
      expect(FormatterDialect(i)).toBe(o)
    })
  })

  it("should resolve valkey to the redis dialect", () => {
    expect(dialectFor('valkey')).toBe('redis')
    expect(getDialectData(dialectFor('valkey'))).toBe(getDialectData('redis'))
  })

  it("should register a valkey client matching redis", () => {
    const valkey = findClient('valkey')
    const redis = findClient('redis')

    expect(valkey).toBeDefined()
    expect(valkey.name).toBe('Valkey')
    expect(valkey.defaultPort).toBe(redis.defaultPort)
    expect(valkey.defaultDatabase).toBe(redis.defaultDatabase)
    expect(valkey.disabledFeatures).toEqual(redis.disabledFeatures)
  })
})
