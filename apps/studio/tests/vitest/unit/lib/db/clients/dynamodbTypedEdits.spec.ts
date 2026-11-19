import { describe, it, expect, vi } from "vitest";
import { NumberValue } from "@aws-sdk/lib-dynamodb";
import { coerceDynamoValue } from "@commercial/backend/lib/db/clients/dynamodb/coerce";
import { DynamoDBClient } from "@commercial/backend/lib/db/clients/dynamodb";
import type { IDbConnectionServer } from "@/lib/db/backendTypes";
import type { IDbConnectionDatabase } from "@/lib/db/types";

describe("coerceDynamoValue", () => {
  it("turns Number text into a NumberValue that keeps the exact digits", () => {
    const out = coerceDynamoValue("99", "Number") as NumberValue;
    expect(out).toBeInstanceOf(NumberValue);
    expect(out.toString()).toBe("99");
    expect((coerceDynamoValue("10.50", "Number") as NumberValue).toString()).toBe("10.50");
    expect((coerceDynamoValue("12345678901234567890", "Number") as NumberValue).toString()).toBe("12345678901234567890");
  });

  it("rejects text that is not a number", () => {
    expect(() => coerceDynamoValue("abc", "Number")).toThrow(/not a valid Number/);
    expect(() => coerceDynamoValue("1,5", "Number")).toThrow(/not a valid Number/);
  });

  it("maps blank non-string values to null", () => {
    expect(coerceDynamoValue("", "Number")).toBeNull();
    expect(coerceDynamoValue("  ", "Map")).toBeNull();
    expect(coerceDynamoValue("", "List")).toBeNull();
  });

  it("parses Map and List JSON", () => {
    expect(coerceDynamoValue('{"city":"Lyon","n":280,"extra":[1,2]}', "Map"))
      .toStrictEqual({ city: "Lyon", n: 280, extra: [1, 2] });
    expect(coerceDynamoValue("[1,2,3]", "List")).toStrictEqual([1, 2, 3]);
  });

  it("rejects JSON of the wrong shape", () => {
    expect(() => coerceDynamoValue("[1]", "Map")).toThrow(/JSON object/);
    expect(() => coerceDynamoValue('{"a":1}', "List")).toThrow(/JSON array/);
    expect(() => coerceDynamoValue("{nope", "Map")).toThrow(/not valid JSON/);
  });

  it("parses Boolean text", () => {
    expect(coerceDynamoValue("true", "Boolean")).toBe(true);
    expect(coerceDynamoValue(" FALSE ", "Boolean")).toBe(false);
    expect(() => coerceDynamoValue("yes", "Boolean")).toThrow(/not a valid Boolean/);
  });

  it("builds sets", () => {
    expect(coerceDynamoValue('["a","b"]', "String Set")).toStrictEqual(new Set(["a", "b"]));
    const nums = coerceDynamoValue("[1,2.5]", "Number Set") as Set<NumberValue>;
    expect([...nums].map((n) => n.toString())).toStrictEqual(["1", "2.5"]);
  });

  it("leaves String, Binary, unknown types and non-strings alone", () => {
    expect(coerceDynamoValue("123", "String")).toBe("123");
    expect(coerceDynamoValue("123", undefined)).toBe("123");
    expect(coerceDynamoValue("x", "Binary")).toBe("x");
    expect(coerceDynamoValue(5, "Number")).toBe(5);
    const obj = { a: 1 };
    expect(coerceDynamoValue(obj, "Map")).toBe(obj);
  });
});

describe("DynamoDBClient typed edits", () => {
  function createClient(columns: { columnName: string; dataType: string }[] = []) {
    const client = new DynamoDBClient(
      { config: { readOnlyMode: false } } as unknown as IDbConnectionServer,
      { database: "" } as IDbConnectionDatabase
    );
    const send = vi.fn().mockResolvedValue({ Attributes: {} });
    client.doc = { send } as any;
    vi.spyOn(client, "listTableColumns").mockResolvedValue(columns as any);
    return { client, send };
  }

  it("stores an edited Number cell as a number, not a string", async () => {
    const { client, send } = createClient();

    await client.updateValues([
      {
        table: "people",
        column: "age",
        columnType: "Number",
        primaryKeys: [{ column: "id", value: "p1" }],
        value: "99",
      },
    ]);

    const value = send.mock.calls[0][0].input.ExpressionAttributeValues[":v"];
    expect(value).toBeInstanceOf(NumberValue);
    expect(value.toString()).toBe("99");
  });

  it("stores an edited Map cell as a map, not JSON text", async () => {
    const { client, send } = createClient();

    await client.updateValues([
      {
        table: "people",
        column: "meta",
        columnType: "Map",
        primaryKeys: [{ column: "id", value: "p1" }],
        value: '{"city":"Lyon","n":280}',
      },
    ]);

    expect(send.mock.calls[0][0].input.ExpressionAttributeValues[":v"])
      .toStrictEqual({ city: "Lyon", n: 280 });
  });

  it("keeps String cells as text", async () => {
    const { client, send } = createClient();

    await client.updateValues([
      {
        table: "people",
        column: "name",
        columnType: "String",
        primaryKeys: [{ column: "id", value: "p1" }],
        value: "42",
      },
    ]);

    expect(send.mock.calls[0][0].input.ExpressionAttributeValues[":v"]).toBe("42");
  });

  it("types the values of inserted rows by their column", async () => {
    const { client, send } = createClient([
      { columnName: "id", dataType: "String" },
      { columnName: "age", dataType: "Number" },
      { columnName: "meta", dataType: "Map" },
    ]);

    await client.insertRows([
      { table: "people", data: [{ id: "p2", age: "5", meta: '{"a":1}' }] },
    ]);

    const item = send.mock.calls[0][0].input.RequestItems.people[0].PutRequest.Item;
    expect(item.id).toBe("p2");
    expect(item.age).toBeInstanceOf(NumberValue);
    expect(item.age.toString()).toBe("5");
    expect(item.meta).toStrictEqual({ a: 1 });
  });

  it("inserts values as given when column types cannot be read", async () => {
    const { client, send } = createClient();
    (client.listTableColumns as any).mockRejectedValue(new Error("boom"));

    await client.insertRows([{ table: "people", data: [{ id: "p3", age: "7" }] }]);

    const item = send.mock.calls[0][0].input.RequestItems.people[0].PutRequest.Item;
    expect(item).toStrictEqual({ id: "p3", age: "7" });
  });
});
