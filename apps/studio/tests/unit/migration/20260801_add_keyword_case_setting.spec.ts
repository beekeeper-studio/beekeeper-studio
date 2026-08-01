// eslint-disable-next-line @typescript-eslint/no-var-requires
const migration = require('@/migration/20260801_add_keyword_case_setting').default

describe('20260801_add_keyword_case_setting migration', () => {
  it('has the expected migration shape', () => {
    expect(migration.name).toBe('20260801_add_keyword_case_setting')
    expect(typeof migration.run).toBe('function')
  })

  it('seeds the keywordCase setting with a preserve default', async () => {
    const query = jest.fn().mockResolvedValue(undefined)
    await migration.run({ query })
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toContain("'keywordCase'")
    expect(query.mock.calls[0][0]).toContain("'preserve'")
    expect(query.mock.calls[0][0]).toContain("'0'")
  })
})
