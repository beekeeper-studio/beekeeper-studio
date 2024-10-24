import { BigQueryData } from "@/shared/lib/dialects/bigquery"




describe("bigquery DialectData", () => {

  it("Should escape identifiers properly", () => {

    const testSet = [
      ["foo\\bar", "`foo\\\\bar`"],
      ["foo`bar", "`foo\\`bar`"],
      ["foo\\ba`r", "`foo\\\\ba\\`r`"]
    ]
    testSet.forEach(([input, expected]) => {
      const output = BigQueryData.wrapIdentifier(input)
      console.log("INPUT", input, "OUTPUT", output, "EXPECTED", expected)
      expect(output).toEqual(expected)
    })


  })
})
