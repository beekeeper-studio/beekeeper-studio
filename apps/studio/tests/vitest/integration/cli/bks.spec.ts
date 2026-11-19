import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { SqliteClient } from "@/lib/db/clients/sqlite";
import { CliServer } from "@/services/cliServer/server";
import { CliBackend, executeCliRequest } from "@/services/cliServer/commands";
import { createProgram } from "@/cli/program";

const socketPath =
  process.platform === "win32"
    ? `\\\\.\\pipe\\bks-cli-it-${process.pid}`
    : path.join(os.tmpdir(), `bks-cli-it-${process.pid}.sock`);

let client: SqliteClient;
let server: CliServer;
let requests = 0;

beforeAll(async () => {
  client = new SqliteClient(
    { config: { client: "sqlite", readOnlyMode: false }, db: {} } as any,
    { database: ":memory:", connected: false, connecting: false } as any,
  );
  await client.connect();
  for (const sql of [
    "create table users (id integer primary key, email text not null, name text)",
    "create table orders (id integer primary key, user_id integer not null references users(id), total real)",
    "create view recent_users as select id, email from users",
    "insert into users (id, email, name) values (1, 'a@example.com', 'Ann'), (2, 'b@example.com', 'Bob')",
  ]) {
    await client.executeQuery(sql);
  }

  const backend: CliBackend = {
    openConnections: () => [
      {
        id: "sid-dev",
        client,
        database: ":memory:",
        config: {
          id: 1,
          name: "Local Dev",
          connectionType: "sqlite",
          readOnlyMode: false,
        } as any,
      },
    ],
    isCliEnabled: async () => true,
  };
  server = new CliServer({
    socketPath,
    handler: (request) => {
      requests += 1;
      return executeCliRequest(backend, request);
    },
  });
  await server.start();
});

afterAll(async () => {
  await server?.stop();
  await client?.disconnect();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Runs `bks <str>` against the test server and returns what it printed. */
async function bks(str: string) {
  let out = "";
  let err = "";

  const before = requests;
  let error = null;
  try {
    await createProgram({
      preventExit: true,
      output: {
        writeOut: (str) => (out += str),
        writeErr: (str) => (err += str),
      },
    }).parseAsync([...str.split(" "), "--socket", socketPath], { from: "user" });
  } catch (e) {
    error = e;
  }
  return {
    out,
    err,
    error,
    sent: requests > before,
    json: () => JSON.parse(out),
  };
}

describe("bks", () => {
  it("lists the open connections", async () => {
    const result = await bks("connections");
    expect(result.json().connections).toEqual([
      expect.objectContaining({ name: "Local Dev", cliEnabled: true }),
    ]);
  });

  it("lists tables", async () => {
    const result = await bks("list-tables");
    const names = result.json().entities.map((e) => e.name);
    expect(names).toEqual(["orders", "users"]);
  });

  it.each([
    ["list-entities -t table,views", ["orders", "recent_users", "users"]],
    ["list-entities --entity-type view --entity-type table", ["orders", "recent_users", "users"]],
    ["list-entities -t view", ["recent_users"]],
    ["list-entities", ["orders", "recent_users", "users"]],
  ])("lists entities of the given types: %s", async (command, expected) => {
    const result = await bks(command);
    const names = result.json().entities.map((e) => e.name);
    expect(names.sort()).toEqual(expected);
  });

  it("rejects unknown entity types without contacting the app", async () => {
    const result = await bks("list-entities -t sequence");
    expect(result.error?.code).toBe("commander.invalidArgument");
    expect(result.err).toContain('Unknown entity type "sequence"');
    expect(result.sent).toBe(false);
  });

  it.each([
    ["structure users", "users"],
    ["structure main.users", "users"],
  ])("describes a table: %s", async (command, name) => {
    const result = (await bks(command)).json();
    expect(result.name).toBe(name);
    expect(result.columns.map((c) => c.name)).toEqual(["id", "email", "name"]);
  });

  it("keeps a dotted name whole when --schema is given", async () => {
    const result = await bks("structure main.users --schema main");
    expect(result.error?.message).toContain("main.users");
  });

  it.each([
    ["structure", "commander.missingArgument"],
    ["structure a b", "commander.excessArguments"],
  ])("needs exactly one name for structure: %s", async (command, code) => {
    const result = await bks(command);
    expect(result.error?.code).toBe(code);
    expect(result.sent).toBe(false);
  });

  it("runs a query from its words", async () => {
    const result = (await bks("query select name from users order by id")).json();
    expect(result.results[0].rows).toEqual([{ name: "Ann" }, { name: "Bob" }]);
  });

  it("keeps numeric looking names as text", async () => {
    const result = await bks("structure 2024");
    expect(result.error?.message).toContain('"2024"');
  });

  it("reads sql from a file", async () => {
    const file = path.join(os.tmpdir(), `bks-cli-it-${process.pid}.sql`);
    fs.writeFileSync(file, "select email from users where id = 2");
    try {
      const result = (await bks(`query --file ${file}`)).json();
      expect(result.results[0].rows).toEqual([{ email: "b@example.com" }]);
    } finally {
      fs.rmSync(file, { force: true });
    }
  });

  it("reads sql from stdin", async () => {
    vi.spyOn(process, "stdin", "get").mockReturnValue(
      Readable.from(["select count(*) as n from users"]) as any,
    );
    const result = (await bks("query -")).json();
    expect(result.results[0].rows).toEqual([{ n: 2 }]);
  });

  it.each([
    ["query select 1 --file x.sql", "not both"],
    ["query", "query needs SQL"],
  ])("rejects ambiguous or missing sql: %s", async (command, message) => {
    const result = await bks(command);
    expect(result.err).toContain(message);
    expect(result.sent).toBe(false);
  });

  it("renders markdown", async () => {
    const result = await bks("query select name from users order by id -f md");
    expect(result.out).toContain("| name |");
    expect(result.out).toMatch(/\| Ann +\|/);
  });

  it("rejects an unknown format", async () => {
    const result = await bks("connections --format xml");
    expect(result.error?.code).toBe("commander.invalidArgument");
    expect(result.sent).toBe(false);
  });

  it.each(["--help", "help", "list-tables -h"])("prints help: %s", async (command) => {
    const result = await bks(command);
    expect(result.error?.exitCode).toBe(0);
    expect(result.out).toContain("Usage: bks");
    expect(result.sent).toBe(false);
  });

  it.each([
    ["frobnicate", "commander.unknownCommand"],
    ["list-tables --verbose", "commander.unknownOption"],
    ["connections extra", "commander.excessArguments"],
    ["connections --file x.sql", "commander.unknownOption"],
    ["list-tables -t table", "commander.unknownOption"],
  ])("rejects bad usage without contacting the app: %s", async (command, code) => {
    const result = await bks(command);
    expect(result.error?.code).toBe(code);
    expect(result.sent).toBe(false);
  });
});
