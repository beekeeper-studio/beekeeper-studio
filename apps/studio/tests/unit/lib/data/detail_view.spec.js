import fs from "fs";
import path from "path";
import { findKeyPosition, findValueInfo } from "../../../../src/lib/data/detail_view";

const jsonStr = fs.readFileSync(
  path.resolve(__dirname, "./sample.json"),
  "utf8"
);

describe("Detail View", () => {
  it("should locate a key property in a JSON text", () => {
    expect(findKeyPosition(jsonStr, ["customer_id"])).toBe(56);
    expect(findKeyPosition(jsonStr, ["inventory_id", "film_id", "original_language_id"])).toBe(15);
    expect(findKeyPosition(jsonStr, ["inventory_id", "store_id", "manager_staff_id", "address_id"])).toBe(33);
    expect(findKeyPosition(jsonStr, ["inventory_id", "store_id", "manager_staff_id", "store_id"])).toBe(35);
    expect(findKeyPosition(jsonStr, ["inventory_id", "store_id", "address_id", "city_id"])).toBe(47);
    expect(findKeyPosition(jsonStr, ["staff_id", "address_id"])).toBe(62);
    expect(findKeyPosition(jsonStr, ["staff_id", "store_id"])).toBe(64);
  });

  it("should find a value info in a line of JSON text", () => {
    const lines = jsonStr.split("\n");
    expect(findValueInfo(lines[15])).toStrictEqual({
      from: 30,
      to: 34,
      value: "null",
    })
  })
});
