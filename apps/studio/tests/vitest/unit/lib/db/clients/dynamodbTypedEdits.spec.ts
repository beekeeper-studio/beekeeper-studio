import { describe, it, expect, vi } from "vitest";
import { NumberValue } from "@aws-sdk/lib-dynamodb";
import {
  DynamoDBNumberTranscoder,
  DynamoDBBooleanTranscoder,
  DynamoDBJsonTranscoder,
  DynamoDBNullTranscoder,
  DynamoBksField,
} from "@/lib/db/serialization/dynamodb_transcoders";
import { DynamoDBClient } from "@commercial/backend/lib/db/clients/dynamodb";
import type { IDbConnectionServer } from "@/lib/db/backendTypes";
import type { IDbConnectionDatabase } from "@/lib/db/types";

describe("DynamoDB transcoders", () => {
  describe("DynamoDBNumberTranscoder", () => {
    it("turns Number text into a NumberValue that keeps the exact digits", () => {
      const out = DynamoDBNumberTranscoder.deserialize("99") as NumberValue;
      expect(out).toBeInstanceOf(NumberValue);
      expect(out.toString()).toBe("99");
      expect((DynamoDBNumberTranscoder.deserialize("10.50") as NumberValue).toString()).toBe("10.50");
      expect((DynamoDBNumberTranscoder.deserialize("12345678901234567890") as NumberValue).toString()).toBe(
        "12345678901234567890"
      );
    });

    it("rejects text that is not a number", () => {
      expect(() => DynamoDBNumberTranscoder.deserialize("abc")).toThrow(/not a valid Number/);
      expect(() => DynamoDBNumberTranscoder.deserialize("1,5")).toThrow(/not a valid Number/);
    });

    it("maps blank string to null", () => {
      expect(DynamoDBNumberTranscoder.deserialize("")).toBeNull();
      expect(DynamoDBNumberTranscoder.deserialize("   ")).toBeNull();
    });

    it("leaves non-string values alone", () => {
      expect(DynamoDBNumberTranscoder.deserialize(42 as any)).toBe(42);
    });
  });

  describe("DynamoDBBooleanTranscoder", () => {
    it("parses Boolean text", () => {
      expect(DynamoDBBooleanTranscoder.deserialize("true")).toBe(true);
      expect(DynamoDBBooleanTranscoder.deserialize(" FALSE ")).toBe(false);
      expect(DynamoDBBooleanTranscoder.deserialize("")).toBeNull();
      expect(() => DynamoDBBooleanTranscoder.deserialize("yes")).toThrow(/not a valid Boolean/);
    });
  });

  describe("DynamoDBJsonTranscoder", () => {
    it("parses Map JSON into object", () => {
      const field: DynamoBksField = { name: "meta", bksType: "OBJECT", dynamoType: "M" };
      expect(DynamoDBJsonTranscoder.deserialize('{"city":"Lyon","n":280,"extra":[1,2]}', field)).toStrictEqual({
        city: "Lyon",
        n: 280,
        extra: [1, 2],
      });
    });

    it("rejects Map JSON that is not an object", () => {
      const field: DynamoBksField = { name: "meta", bksType: "OBJECT", dynamoType: "M" };
      expect(() => DynamoDBJsonTranscoder.deserialize("[1]", field)).toThrow(/JSON object/);
      expect(() => DynamoDBJsonTranscoder.deserialize("{invalid", field)).toThrow(/not valid JSON/);
    });

    it("parses List JSON into array", () => {
      const field: DynamoBksField = { name: "tags", bksType: "ARRAY", dynamoType: "L" };
      expect(DynamoDBJsonTranscoder.deserialize("[1,2,3]", field)).toStrictEqual([1, 2, 3]);
    });

    it("rejects List JSON that is not an array", () => {
      const field: DynamoBksField = { name: "tags", bksType: "ARRAY", dynamoType: "L" };
      expect(() => DynamoDBJsonTranscoder.deserialize('{"a":1}', field)).toThrow(/JSON array/);
    });

    it("builds String Sets and Number Sets", () => {
      const stringSetField: DynamoBksField = { name: "ss", bksType: "ARRAY", dynamoType: "SS" };
      expect(DynamoDBJsonTranscoder.deserialize('["a","b"]', stringSetField)).toStrictEqual(new Set(["a", "b"]));

      const numberSetField: DynamoBksField = { name: "ns", bksType: "ARRAY", dynamoType: "NS" };
      const nums = DynamoDBJsonTranscoder.deserialize("[1,2.5]", numberSetField) as Set<NumberValue>;
      expect([...nums].map((n) => n.toString())).toStrictEqual(["1", "2.5"]);
    });
  });

  describe("DynamoDBNullTranscoder", () => {
    it("returns null for Null fields", () => {
      const field: DynamoBksField = { name: "nil", bksType: "UNKNOWN", dynamoType: "NULL" };
      expect(DynamoDBNullTranscoder.deserialize("anything", field)).toBeNull();
    });
  });
});

describe("DynamoDBClient typed edits via applyChanges", () => {
  function createClient(columns: { columnName: string; dataType: string; bksField: DynamoBksField }[] = []) {
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
    const { client, send } = createClient([
      { columnName: "id", dataType: "String", bksField: { name: "id", bksType: "STRING", dynamoType: "S" } },
      { columnName: "age", dataType: "Number", bksField: { name: "age", bksType: "NUMBER", dynamoType: "N" } },
    ]);

    await client.applyChanges({
      inserts: [],
      deletes: [],
      updates: [
        {
          table: "people",
          column: "age",
          columnType: "Number",
          primaryKeys: [{ column: "id", value: "p1" }],
          value: "99",
        },
      ],
    });

    const value = send.mock.calls[0][0].input.ExpressionAttributeValues[":v"];
    expect(value).toBeInstanceOf(NumberValue);
    expect(value.toString()).toBe("99");
  });

  it("stores an edited Map cell as a map, not JSON text", async () => {
    const { client, send } = createClient([
      { columnName: "id", dataType: "String", bksField: { name: "id", bksType: "STRING", dynamoType: "S" } },
      { columnName: "meta", dataType: "Map", bksField: { name: "meta", bksType: "OBJECT", dynamoType: "M" } },
    ]);

    await client.applyChanges({
      inserts: [],
      deletes: [],
      updates: [
        {
          table: "people",
          column: "meta",
          columnType: "Map",
          primaryKeys: [{ column: "id", value: "p1" }],
          value: '{"city":"Lyon","n":280}',
        },
      ],
    });

    expect(send.mock.calls[0][0].input.ExpressionAttributeValues[":v"]).toStrictEqual({ city: "Lyon", n: 280 });
  });

  it("keeps String cells as text", async () => {
    const { client, send } = createClient([
      { columnName: "id", dataType: "String", bksField: { name: "id", bksType: "STRING", dynamoType: "S" } },
      { columnName: "name", dataType: "String", bksField: { name: "name", bksType: "STRING", dynamoType: "S" } },
    ]);

    await client.applyChanges({
      inserts: [],
      deletes: [],
      updates: [
        {
          table: "people",
          column: "name",
          columnType: "String",
          primaryKeys: [{ column: "id", value: "p1" }],
          value: "42",
        },
      ],
    });

    expect(send.mock.calls[0][0].input.ExpressionAttributeValues[":v"]).toBe("42");
  });

  it("types the values of inserted rows by their column", async () => {
    const { client, send } = createClient([
      { columnName: "id", dataType: "String", bksField: { name: "id", bksType: "STRING", dynamoType: "S" } },
      { columnName: "age", dataType: "Number", bksField: { name: "age", bksType: "NUMBER", dynamoType: "N" } },
      { columnName: "meta", dataType: "Map", bksField: { name: "meta", bksType: "OBJECT", dynamoType: "M" } },
    ]);

    await client.applyChanges({
      updates: [],
      deletes: [],
      inserts: [{ table: "people", data: [{ id: "p2", age: "5", meta: '{"a":1}' }] }],
    });

    const item = send.mock.calls[0][0].input.RequestItems.people[0].PutRequest.Item;
    expect(item.id).toBe("p2");
    expect(item.age).toBeInstanceOf(NumberValue);
    expect(item.age.toString()).toBe("5");
    expect(item.meta).toStrictEqual({ a: 1 });
  });

  it("inserts values as given when column types cannot be read", async () => {
    const { client, send } = createClient();
    (client.listTableColumns as any).mockRejectedValue(new Error("boom"));

    await client.applyChanges({
      updates: [],
      deletes: [],
      inserts: [{ table: "people", data: [{ id: "p3", age: "7" }] }],
    });

    const item = send.mock.calls[0][0].input.RequestItems.people[0].PutRequest.Item;
    expect(item).toStrictEqual({ id: "p3", age: "7" });
  });
});
