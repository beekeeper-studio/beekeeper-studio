import { safeSqlFormat } from '@/common/utils'
import { formatOptionsFor } from '@shared/lib/dialects/models'

const dynamoOpts = () => formatOptionsFor('dynamodb')

describe('PartiQL formatter', () => {
  it('returns a DialectOptions shape for dynamodb', () => {
    const opts = dynamoOpts()
    expect('dialect' in opts).toBe(true)
    if ('dialect' in opts) {
      expect(opts.dialect.name).toBe('partiql')
    }
  })

  it('formats a basic SELECT and preserves double-quoted identifiers', () => {
    const sql = `select "id","name" from "Users" where "id"='u1'`
    const out = safeSqlFormat(sql, dynamoOpts())

    // sql-formatter's default keywordCase is "preserve", so we match
    // case-insensitively. The important properties are: clauses land on
    // separate lines (hallmark of a successful parse), identifiers keep
    // their double-quotes, and string literals keep their single quotes.
    expect(out).toMatch(/select/i)
    expect(out).toMatch(/from/i)
    expect(out).toMatch(/where/i)
    expect(out).toContain('"Users"')
    expect(out).toContain('"id"')
    expect(out).toContain("'u1'")
    // No double-quote-as-string conversion — the identifier must still be quoted
    expect(out).not.toContain("'Users'")
    // Clause-per-line layout proves the formatter ran (vs. returning raw input)
    expect(out.split('\n').length).toBeGreaterThanOrEqual(3)
  })

  it('formats an UPDATE', () => {
    const sql = `update "Users" set "age"=42 where "id"='u1'`
    const out = safeSqlFormat(sql, dynamoOpts())

    expect(out).toMatch(/update/i)
    expect(out).toMatch(/set/i)
    expect(out).toMatch(/where/i)
    expect(out).toContain('42')
  })

  it('round-trips an INSERT with a document literal intact', () => {
    // PartiQL's INSERT ... VALUE {...} syntax isn't in sql-formatter's grammar,
    // so the input is expected to survive unchanged (either because the
    // formatter treats {} as an extraParens block or because safeSqlFormat
    // falls back on parse error). Either way, the document literal content
    // and the VALUE keyword must not be corrupted.
    const sql = `INSERT INTO "T" VALUE {'id': 'x', 'name': 'y'}`
    const out = safeSqlFormat(sql, dynamoOpts())

    expect(out).toContain("'id'")
    expect(out).toContain("'x'")
    expect(out).toContain("'name'")
    expect(out).toContain("'y'")
    expect(out).toMatch(/VALUE/i)
    expect(out).toContain('"T"')
  })

  it('falls back to raw input on unparseable garbage', () => {
    const garbage = `@@@ not valid >>> partiql @@@`
    const out = safeSqlFormat(garbage, dynamoOpts())
    expect(out).toBe(garbage)
  })

  it('does not leak across dialects — postgres options still produce a language config', () => {
    const pg = formatOptionsFor('postgresql')
    expect('language' in pg).toBe(true)
    if ('language' in pg) {
      expect(pg.language).toBe('postgresql')
    }
  })
})
