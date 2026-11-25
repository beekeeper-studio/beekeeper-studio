import { describe, expect, it } from "vitest";
import { OracleChangeBuilder } from "@shared/lib/sql/change_builder/OracleChangeBuilder";
import { SnowflakeChangeBuilder } from "@shared/lib/sql/change_builder/SnowflakeChangeBuilder";

describe("clearing a column comment", () => {
  it("uses an empty literal where IS NULL is not valid", () => {
    const oracle = new OracleChangeBuilder("emp", "hr");
    expect(oracle.setComment("ename", null)).toMatch(/IS ''$/);
    expect(oracle.setComment("ename", "")).toMatch(/IS ''$/);
    expect(oracle.setComment("ename", "hello")).toMatch(/IS 'hello'$/);

    const snowflake = new SnowflakeChangeBuilder("emp", "public");
    expect(snowflake.setComment("ename", null)).toMatch(/IS ''$/);
    expect(snowflake.setComment("ename", "hello")).toMatch(/IS 'hello'$/);
  });
});
