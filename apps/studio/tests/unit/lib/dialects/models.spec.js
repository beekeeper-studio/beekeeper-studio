import { FormatterDialect } from "@shared/lib/dialects/models"



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
})
