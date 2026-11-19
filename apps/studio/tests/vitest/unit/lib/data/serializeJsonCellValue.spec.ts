import { describe, it, expect } from "vitest";
import knex from "knex";
import { serializeJsonCellValue } from "@/lib/data/tools";

describe("inserting a cloned JSON cell", () => {
  // knex renders arrays as value lists, so a raw [] became `values (, 'x')`
  it.each([
    [[], "'[]'"],
    [{}, "'{}'"],
    [["a", "b"], `'[\\"a\\",\\"b\\"]'`],
  ])("builds a valid MySQL insert for %j", (value, rendered) => {
    const sql = knex({ client: "mysql2" })("t")
      .insert({ extensions: serializeJsonCellValue("json", value), name: "x" })
      .toString();
    expect(sql).toBe(`insert into \`t\` (\`extensions\`, \`name\`) values (${rendered}, 'x')`);
  });
});

describe("serializeJsonCellValue", () => {
  it.each(["json", "jsonb", "JSON", "JSONB"])("serializes parsed values for %s columns", (dataType) => {
    expect(serializeJsonCellValue(dataType, [])).toBe("[]");
    expect(serializeJsonCellValue(dataType, {})).toBe("{}");
    expect(serializeJsonCellValue(dataType, ["a", "b"])).toBe('["a","b"]');
    expect(serializeJsonCellValue(dataType, { a: [1, { b: null }] })).toBe('{"a":[1,{"b":null}]}');
  });

  it("does not double-encode values that are already strings", () => {
    expect(serializeJsonCellValue("json", "[]")).toBe("[]");
    expect(serializeJsonCellValue("jsonb", '{"a":1}')).toBe('{"a":1}');
  });

  it("leaves scalars and null alone", () => {
    expect(serializeJsonCellValue("json", null)).toBeNull();
    expect(serializeJsonCellValue("json", undefined)).toBeUndefined();
    expect(serializeJsonCellValue("json", 1)).toBe(1);
    expect(serializeJsonCellValue("json", true)).toBe(true);
  });

  it("leaves non-JSON columns alone", () => {
    const tags = ["a", "b"];
    expect(serializeJsonCellValue("_text", tags)).toBe(tags);
    expect(serializeJsonCellValue("varchar(255)", tags)).toBe(tags);
    expect(serializeJsonCellValue(undefined, tags)).toBe(tags);
  });
});
