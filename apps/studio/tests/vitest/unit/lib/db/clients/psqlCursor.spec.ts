import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import fs from "fs";
import os from "os";
import path from "path";
import { PsqlCursor } from "@/lib/db/clients/postgresql/PsqlCursor";
import { CsvExporter } from "@/lib/export/formats/csv";

// https://github.com/beekeeper-studio/beekeeper-studio/issues/5074
// A failed table export left its pooled connection checked out, so a few
// failures exhausted the pool and every later query hung.

interface FakeCursorOptions {
  readError?: Error;
  closeError?: Error;
}

function fakeCursor({ readError, closeError }: FakeCursorOptions = {}) {
  let sent = false;
  return {
    read: vi.fn((_rows: number, cb: (err: any, rows?: any[][], result?: any) => void) => {
      if (readError) return cb(readError);
      const rows = sent ? [] : [[1, "alpha"]];
      sent = true;
      cb(undefined, rows, { fields: [{ name: "id", dataTypeID: 23 }, { name: "name", dataTypeID: 25 }] });
    }),
    close: vi.fn((cb: (err?: Error) => void) => cb(closeError)),
  };
}

function setup(options: FakeCursorOptions = {}) {
  const cursor = fakeCursor(options);
  const client = Object.assign(new EventEmitter(), {
    query: vi.fn(() => cursor),
    release: vi.fn(),
  });
  const connector = { getRawConnection: vi.fn(async () => client) };
  const psqlCursor = new PsqlCursor({
    query: "select * from customers",
    params: [],
    connector: connector as any,
    chunkSize: 100,
    dataTypes: { 23: "int4", 25: "text" },
  });
  return { cursor, client, connector, psqlCursor };
}

describe("PsqlCursor", () => {
  it("releases the client when it is closed after a full read", async () => {
    const { client, psqlCursor } = setup();
    await psqlCursor.start();
    expect(await psqlCursor.read()).toEqual([[1, "alpha"]]);
    expect(await psqlCursor.read()).toEqual([]);
    await psqlCursor.close();

    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(false);
    expect(client.listenerCount("error")).toBe(0);
  });

  it("releases and destroys the client when a read fails", async () => {
    const { client, psqlCursor } = setup({
      readError: new Error("unimplemented: multiple active portals not supported"),
    });
    await psqlCursor.start();

    await expect(psqlCursor.read()).rejects.toEqual(
      "unimplemented: multiple active portals not supported"
    );
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(true);

    // closing afterwards settles and does not release a second time
    await expect(psqlCursor.close()).resolves.toBeUndefined();
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("releases and destroys the client when closing the cursor fails", async () => {
    const { client, psqlCursor } = setup({ closeError: new Error("cursor is in an error state") });
    await psqlCursor.start();

    await expect(psqlCursor.close()).rejects.toEqual("cursor is in an error state");
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(true);
    expect(client.listenerCount("error")).toBe(0);
  });

  it("releases and destroys the client after a connection error", async () => {
    const { client, psqlCursor } = setup();
    await psqlCursor.start();
    client.emit("error", new Error("Connection terminated unexpectedly"));

    await expect(psqlCursor.read()).rejects.toThrow("Connection terminated unexpectedly");
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it("settles a close that comes before start", async () => {
    const { client, psqlCursor } = setup();
    await expect(psqlCursor.close()).resolves.toBeUndefined();
    expect(client.release).not.toHaveBeenCalled();
  });
});

describe("PostgreSQL table export", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-psql-export-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function exporterFor(psqlCursor: PsqlCursor, file: string) {
    const connection = {
      connectionType: "postgresql",
      selectTopStream: async () => ({
        totalRows: 1,
        columns: [
          { columnName: "id", dataType: "int4" },
          { columnName: "name", dataType: "text" },
        ],
        cursor: psqlCursor,
      }),
    } as any;
    return new CsvExporter(
      file, connection, { name: "customers" } as any, "", "", [],
      { chunkSize: 100, deleteOnAbort: false },
      { header: true, delimiter: "," }, false
    );
  }

  it("gives the connection back when the export fails", async () => {
    const { client, psqlCursor } = setup({
      readError: new Error("unimplemented: multiple active portals not supported"),
    });
    const exporter = exporterFor(psqlCursor, path.join(dir, "customers.csv"));

    await exporter.exportToFile();

    expect(exporter.error).toBeTruthy();
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("closes the cursor when writing a row fails", async () => {
    const { cursor, client, psqlCursor } = setup();
    const exporter = exporterFor(psqlCursor, path.join(dir, "customers.csv"));
    vi.spyOn(exporter, "formatRow").mockImplementation(() => {
      throw new Error("could not format row");
    });

    await exporter.exportToFile();

    expect(exporter.error).toBeTruthy();
    expect(cursor.close).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("releases the connection once after a successful export", async () => {
    const { client, psqlCursor } = setup();
    const file = path.join(dir, "customers.csv");
    const exporter = exporterFor(psqlCursor, file);

    await exporter.exportToFile();

    expect(exporter.error).toBeNull();
    expect(fs.readFileSync(file, "utf-8")).toEqual("id,name\n1,alpha\n");
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(false);
  });
});
