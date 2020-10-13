import { sqlSuggestion } from '../../../src/lib/sql-suggestions'

describe("SQL suggestions", () => {
  it("should return select statement when empty", () => {
    const x = sqlSuggestion('sqlite', '', {})
    expect(x.suggestions.length).toBe(1)
    expect(x.suggestions[0].insertText).toBe('select ${0:*} from $1')
  })
})
