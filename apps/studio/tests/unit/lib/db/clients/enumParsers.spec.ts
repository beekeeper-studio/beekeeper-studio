import { parseQuotedEnumValues, parseClickHouseEnumValues } from "@/lib/db/clients/enumParsers"

describe("parseQuotedEnumValues (MySQL / MariaDB / DuckDB)", () => {
  it("parses a simple enum definition", () => {
    expect(parseQuotedEnumValues("enum('a','b','c')")).toEqual(['a', 'b', 'c'])
  })

  it("is case-insensitive and tolerates spaces after commas (DuckDB style)", () => {
    expect(parseQuotedEnumValues("ENUM('a', 'b', 'c')")).toEqual(['a', 'b', 'c'])
  })

  it("keeps commas that appear inside values", () => {
    expect(parseQuotedEnumValues("enum('a,b','c')")).toEqual(['a,b', 'c'])
  })

  it("unescapes doubled single quotes", () => {
    expect(parseQuotedEnumValues("enum('o''clock','noon')")).toEqual(["o'clock", 'noon'])
  })

  it("handles a single value", () => {
    expect(parseQuotedEnumValues("enum('only')")).toEqual(['only'])
  })

  it("returns undefined for non-enum types", () => {
    expect(parseQuotedEnumValues("varchar(20)")).toBeUndefined()
    expect(parseQuotedEnumValues("int")).toBeUndefined()
    expect(parseQuotedEnumValues("set('x','y')")).toBeUndefined()
    expect(parseQuotedEnumValues(undefined)).toBeUndefined()
    expect(parseQuotedEnumValues(null)).toBeUndefined()
  })
})

describe("parseClickHouseEnumValues", () => {
  it("parses Enum8 with integer mappings", () => {
    expect(parseClickHouseEnumValues("Enum8('a' = 1, 'b' = 2)")).toEqual(['a', 'b'])
  })

  it("parses Enum16", () => {
    expect(parseClickHouseEnumValues("Enum16('x' = 1)")).toEqual(['x'])
  })

  it("ignores negative integer mappings", () => {
    expect(parseClickHouseEnumValues("Enum8('a' = -1, 'b' = 1)")).toEqual(['a', 'b'])
  })

  it("unwraps Nullable()", () => {
    expect(parseClickHouseEnumValues("Nullable(Enum8('a' = 1, 'b' = 2))")).toEqual(['a', 'b'])
  })

  it("unwraps LowCardinality()", () => {
    expect(parseClickHouseEnumValues("LowCardinality(Enum8('a' = 1))")).toEqual(['a'])
  })

  it("unescapes backslash-escaped quotes", () => {
    expect(parseClickHouseEnumValues("Enum8('a\\'b' = 1)")).toEqual(["a'b"])
  })

  it("returns undefined for non-enum types", () => {
    expect(parseClickHouseEnumValues("String")).toBeUndefined()
    expect(parseClickHouseEnumValues("Int32")).toBeUndefined()
    expect(parseClickHouseEnumValues("Nullable(String)")).toBeUndefined()
    expect(parseClickHouseEnumValues(undefined)).toBeUndefined()
    expect(parseClickHouseEnumValues(null)).toBeUndefined()
  })
})
