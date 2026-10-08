import { describe, it, expect } from "vitest";
import { normalizeFilters, parseInFilterValue } from "@/common/utils";

describe("parseInFilterValue", () => {
  it("splits plain comma separated values", () => {
    expect(parseInFilterValue("foo,bar")).toEqual(["foo", "bar"]);
    expect(parseInFilterValue(" foo ,  bar baz , 3 ")).toEqual(["foo", "bar baz", "3"]);
  });

  it("parses the output of Copy for IN statement", () => {
    expect(parseInFilterValue("(\n'foo',\n'bar'\n)")).toEqual(["foo", "bar"]);
    expect(parseInFilterValue("(\n1,\n2,\n3\n)")).toEqual(["1", "2", "3"]);
  });

  it("parses an IN list without newlines", () => {
    expect(parseInFilterValue("('foo', 'bar')")).toEqual(["foo", "bar"]);
    expect(parseInFilterValue("(1, 2)")).toEqual(["1", "2"]);
  });

  it("unescapes doubled quotes and keeps commas inside quotes", () => {
    expect(parseInFilterValue("('it''s', 'a,b', '')")).toEqual(["it's", "a,b", ""]);
  });

  it("allows quoted and unquoted values to be mixed", () => {
    expect(parseInFilterValue("'foo', bar, 'baz'")).toEqual(["foo", "bar", "baz"]);
  });

  it("does not treat apostrophes inside unquoted values as quotes", () => {
    expect(parseInFilterValue("O'Brien, Smith")).toEqual(["O'Brien", "Smith"]);
  });

  it("falls back to plain splitting on an unterminated quote", () => {
    expect(parseInFilterValue("'foo, bar")).toEqual(["'foo", "bar"]);
  });
});

describe("normalizeFilters", () => {
  it("parses IN filter values", () => {
    const filters = normalizeFilters([
      { field: "name", type: "in", value: "(\n'foo',\n'bar'\n)" },
    ]);
    expect(filters).toEqual([
      { field: "name", type: "in", value: ["foo", "bar"] },
    ]);
  });
});
