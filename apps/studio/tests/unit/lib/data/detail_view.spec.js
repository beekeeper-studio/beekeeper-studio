import fs from "fs";
import path from "path";
import {
  deepFilterObjectProps,
  findKeyPosition,
  findValueInfo,
  eachPaths,
} from "../../../../src/lib/data/detail_view";

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

  it("should filter a JSON object", () => {
    const obj = JSON.parse(jsonStr);
    const filtered = deepFilterObjectProps(obj, "address");
    expect(filtered).toStrictEqual({
      inventory_id: {
        store_id: {
          address_id: {
            address: "47 MySakila Drive",
            address2: null,
            address_id: 1,
            city_id: 300,
            district: " ",
            last_update: "2006-02-15 04:45:30",
            phone: " ",
            postal_code: null,
          },
          manager_staff_id: {
            address_id: 3,
          },
        },
      },
      staff_id: {
        address_id: 3,
      },
    })
  })

  it("should recursively iterate through a JSON object", () => {
    const obj = {
      a: 0,
      b: {
        c: 1,
        d: { e: 2 },
      },
    }
    const expected = [
      "a",
      "b.c",
      "b.d.e",
    ]
    const result = []
    eachPaths(obj, (path,val) => {
      result.push(path)
    })
    expect(result).toStrictEqual(expected)
  })


});
