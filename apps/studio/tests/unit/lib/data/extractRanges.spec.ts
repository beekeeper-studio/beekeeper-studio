import { extractRanges } from "@/lib/menu/tableMenu";

describe("Extract ranges", () => {
  it("should extract ranges", async () => {
    const data = [
      { uuid: "2a0", name: "Alice", age: 20 },
      { uuid: "2b1", name: "Bob", age: 21 },
      { uuid: "2c2", name: "Charlie", age: 22 },
      { uuid: "2d3", name: "Dave", age: 23 },
    ];

    const getRange = (start: string, end: string) => {
      const columns = Object.keys(data[0]);
      const parse = (cell: string) => {
        const [row, col] = cell.split(",");
        return [Number(row), columns.indexOf(col)];
      };
      const between = (a: number, b: number, arr: any[]) =>
        arr.slice(Math.min(a, b), Math.max(a, b) + 1);

      const [startRow, startCol] = parse(start);
      const [endRow, endCol] = parse(end);
      const cols = between(startCol, endCol, columns);
      return between(startRow, endRow, data).map((row: any) =>
        Object.fromEntries(cols.map((c: string) => [c, row[c]]))
      );
    };

    expect(getRange("0,uuid", "2,name")).toEqual([
      { uuid: "2a0", name: "Alice" },
      { uuid: "2b1", name: "Bob" },
      { uuid: "2c2", name: "Charlie" },
    ]);
  });
});
