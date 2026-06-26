import { parseRowData } from '../../../../../src/lib/db/clients/bigquery'

describe("BigQuery unit tests", () => {
  describe("parseRowData", () => {
    it("should pass through primitive values unchanged", () => {
      const data = [{ id: 1, name: "beekeeper", active: true, missing: null }]
      expect(parseRowData(data)).toEqual([
        { id: 1, name: "beekeeper", active: true, missing: null },
      ])
    })

    it("should unwrap objects that expose a `value` property", () => {
      // BigQuery wraps DATE/TIMESTAMP/etc. as objects with a `value` string
      const data = [{ created: { value: "2026-06-24" } }]
      expect(parseRowData(data)).toEqual([{ created: "2026-06-24" }])
    })

    it("should call toFixed() on big.js 'Big' numerics", () => {
      // NUMERIC / BIGNUMERIC come back as big.js Big instances, which
      // serialize via toFixed() rather than exposing a `value` property
      const big = { toFixed: () => "12345.6789" }
      const data = [{ amount: big }]
      expect(parseRowData(data)).toEqual([{ amount: "12345.6789" }])
    })

    it("should prefer `value` over toFixed when both are present", () => {
      const both = { value: "wrapped", toFixed: () => "fixed" }
      const data = [{ col: both }]
      expect(parseRowData(data)).toEqual([{ col: "wrapped" }])
    })

    it("should leave plain objects without `value`/`toFixed` untouched", () => {
      const nested = { a: 1, b: 2 }
      const data = [{ payload: nested }]
      expect(parseRowData(data)).toEqual([{ payload: { a: 1, b: 2 } }])
    })

    it("should not treat null as an object", () => {
      const data = [{ nothing: null }]
      expect(parseRowData(data)).toEqual([{ nothing: null }])
    })

    it("should handle mixed columns and multiple rows", () => {
      const data = [
        {
          id: 1,
          price: { toFixed: () => "9.99" },
          created: { value: "2026-01-01" },
          label: "first",
        },
        {
          id: 2,
          price: { toFixed: () => "0.00" },
          created: { value: "2026-12-31" },
          label: "second",
        },
      ]
      expect(parseRowData(data)).toEqual([
        { id: 1, price: "9.99", created: "2026-01-01", label: "first" },
        { id: 2, price: "0.00", created: "2026-12-31", label: "second" },
      ])
    })

    it("should return an empty array for empty input", () => {
      expect(parseRowData([])).toEqual([])
    })
  })
})
