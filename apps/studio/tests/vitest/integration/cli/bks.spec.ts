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
import { CliServer } from "@/services/cliServer/CliServer";
import { UtilityApi } from "@/services/UtilityApi";
import { getConnectedStates, newState, state, State } from "@/handlers/handlerState";
import { createProgram } from "@/cli/program";
import {
  ApprovalRequester,
  CliAccess,
  CliError,
  CliCreateTabRequest,
} from "@beekeeperstudio/cli";

const socketPath =
  process.platform === "win32"
    ? `\\\\.\\pipe\\bks-cli-it-${process.pid}`
    : path.join(os.tmpdir(), `bks-cli-it-${process.pid}.sock`);

/** The parts of UtilityApi that reach the app's renderers, faked by the test. */
interface FakeParts {
  openConnections(): {
    id: string;
    client: SqliteClient;
    database: string | null;
    config: any;
  }[];
  askRendererForAccess(
    connectionState: State,
    request: ApprovalRequester,
    signal: AbortSignal,
  ): Promise<CliAccess | null>;
  askRendererToCreateTab(
    connectionState: State,
    request: CliCreateTabRequest,
  ): Promise<number>;
  askRendererToSwitchTab(
    connectionState: State,
    tabId: number,
  ): Promise<void>;
}

/** UtilityApi with its connections and renderers replaced by a fake. */
class TestUtilityApi extends UtilityApi {
  constructor(private readonly fake: FakeParts) {
    super();
    // Only this test's fake connections count as open.
    for (const connected of getConnectedStates()) {
      connected.connection = null;
    }
    for (const connection of fake.openConnections()) {
      newState(connection.id);
      state(connection.id).connection = connection.client;
      state(connection.id).usedConfig = connection.config;
      state(connection.id).database = connection.database;
    }
  }

  protected askRendererForAccess(
    connectionState: State,
    request: ApprovalRequester,
    signal: AbortSignal,
  ) {
    return this.fake.askRendererForAccess(connectionState, request, signal);
  }

  protected askRendererToCreateTab(
    connectionState: State,
    request: CliCreateTabRequest,
  ) {
    return this.fake.askRendererToCreateTab(connectionState, request);
  }

  protected askRendererToSwitchTab(connectionState: State, tabId: number) {
    return this.fake.askRendererToSwitchTab(connectionState, tabId);
  }
}

const APPROVED: CliAccess = {
  queryTypes: ["select"],
  savedQueriesRead: false,
  savedQueriesWrite: false,
  openTabs: true,
};

/** Every approval dialog shown, and how the fake user answers the next ones. */
const approvals = {
  asked: [] as ApprovalRequester[],
  dialogs: [] as AbortSignal[],
  delayMs: 0,
  deny: new Set<string>(),
};

let client: SqliteClient;
let server: CliServer;
let requests = 0;
const created: CliCreateTabRequest[] = [];

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

  const backend: FakeParts = {
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
    askRendererForAccess: async (_connection, request, signal) => {
      approvals.asked.push(request);
      approvals.dialogs.push(signal);
      if (approvals.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, approvals.delayMs));
      }
      return approvals.deny.has(request.clientName) ? null : APPROVED;
    },
    askRendererToCreateTab: async (_connection, request) => {
      created.push(request);
      return created.length;
    },
    askRendererToSwitchTab: async (_connection, tabId) => {
      if (tabId > created.length) {
        throw new CliError("NOT_FOUND", `No open tab with id ${tabId}.`);
      }
    },
  };
  server = new CliServer({ socketPath });
  const utilityApi = new TestUtilityApi(backend);
  for (const command of utilityApi.getCliApis()) {
    server.register(command.name, command.func);
  }
  server.on("requestHandled", () => {
    requests += 1;
  });
  await server.start();
  // The client every other test runs as.
  await bks("request-approval");
});

afterAll(async () => {
  await server?.stop();
  await client?.disconnect();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Runs `bks <str>` against the test server and returns what it printed. */
async function bks(str: string, clientName = "Test Agent") {
  let out = "";
  let err = "";

  const before = requests;
  let error = null;
  try {
    await createProgram({
      version: "1.2.3",
      preventExit: true,
      clientName,
      output: {
        writeOut: (str) => (out += str),
        writeErr: (str) => (err += str),
      },
    }).parseAsync([...str.split(" "), "--socket", socketPath], {
      from: "user",
    });
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

describe("bks approval", () => {
  afterEach(() => {
    approvals.delayMs = 0;
    approvals.deny.clear();
  });

  it("fails without approval and prints how to ask for it", async () => {
    const result = await bks("schemas", "Fresh Agent");
    expect(result.error?.message).toContain("Error (NOT_APPROVED)");
    expect(result.error?.message).toContain(
      'bks request-approval --connection "Local Dev"',
    );
    expect(approvals.asked.some((a) => a.clientName === "Fresh Agent")).toBe(false);
  });

  it("closes the approval dialog when it gives up after --timeout", async () => {
    approvals.delayMs = 300;
    const result = await bks("request-approval --timeout 50", "Slow Agent");
    expect(result.error?.message).toContain("No reply from Beekeeper Studio after 50ms.");
    await vi.waitFor(() => expect(approvals.dialogs.at(-1)?.aborted).toBe(true));

    // the user approves the stale dialog anyway
    await new Promise((resolve) => setTimeout(resolve, 300));
    const again = await bks("schemas", "Slow Agent");
    expect(again.error?.message).toContain("Error (NOT_APPROVED)");
  });

  it("answers r as an alias of request-approval", async () => {
    const result = await bks("r");
    expect(result.json()).toMatchObject({ newlyApproved: false });
  });

  it("fails when the user denies", async () => {
    approvals.deny.add("Denied Agent");
    const result = await bks("request-approval", "Denied Agent");
    expect(result.error?.message).toContain("Error (ACCESS_DENIED)");
  });
});

describe("bks", () => {
  it("lists the open connections, approved once a command ran", async () => {
    const before = await bks("connections", "New Agent");
    expect(before.json().connections).toEqual([
      expect.objectContaining({ name: "Local Dev", approved: false }),
    ]);
    await bks("request-approval", "New Agent");
    const after = await bks("connections", "New Agent");
    expect(after.json().connections[0].approved).toBe(true);
  });

  it("lists tables", async () => {
    const result = await bks("tables");
    const names = result.json().entities.map((e) => e.name);
    expect(names).toEqual(["orders", "users"]);
  });

  it.each([
    ["entities -t table views", ["orders", "recent_users", "users"]],
    [
      "entities --type view --type table",
      ["orders", "recent_users", "users"],
    ],
    ["entities -t view", ["recent_users"]],
    ["entities", ["orders", "recent_users", "users"]],
  ])("lists entities of the given types: %s", async (command, expected) => {
    const result = await bks(command);
    const names = result.json().entities.map((e) => e.name);
    expect(names.sort()).toEqual(expected);
  });

  it("rejects unknown entity types without contacting the app", async () => {
    const result = await bks("entities -t sequence");
    expect(result.error?.code).toBe("commander.invalidArgument");
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

  it("keeps numeric looking names as text", async () => {
    const result = await bks("structure 2024");
    expect(result.error?.message).toContain('"2024"');
  });

  it("reads sql from a file", async () => {
    const file = path.join(os.tmpdir(), `bks-cli-it-${process.pid}.sql`);
    fs.writeFileSync(file, "select email from users where id = 2");
    try {
      await bks(`create-tab query --file ${file}`);
      expect(created.at(-1)).toEqual({
        tab: "query",
        sql: "select email from users where id = 2",
      });
    } finally {
      fs.rmSync(file, { force: true });
    }
  });

  it("reads sql from stdin", async () => {
    vi.spyOn(process, "stdin", "get").mockReturnValue(
      Readable.from(["select count(*) as n from users"]) as any,
    );
    await bks("create-tab query -");
    expect(created.at(-1)).toEqual({
      tab: "query",
      sql: "select count(*) as n from users",
    });
  });

  it.each([
    ["create-tab chart", "commander.unknownCommand"],
    ["create-tab table users", "commander.unknownCommand"],
    ["create-tab query --schema public", "commander.unknownOption"],
  ])("rejects bad create-tab usage: %s", async (command, code) => {
    const result = await bks(command);
    expect(result.error?.code).toBe(code);
    expect(result.sent).toBe(false);
  });

  it("needs something to change for saved-queries update", async () => {
    const result = await bks("saved-queries update 3");
    expect(result.err).toContain("pass a new --title, new SQL, or both");
    expect(result.sent).toBe(false);
    expect((await bks("saved-queries get abc")).sent).toBe(false);
  });

  it("rejects sql given both ways", async () => {
    const result = await bks("create-tab query select 1 --file x.sql");
    expect(result.err).toContain("not both");
    expect(result.sent).toBe(false);
  });

  it("opens a query tab with or without sql", async () => {
    await bks("create-tab query select count(*) from users");
    await bks("create-tab query");
    expect(created.slice(-2)).toEqual([
      { tab: "query", sql: "select count(*) from users" },
      { tab: "query" },
    ]);
  });

  it("prints the created tab", async () => {
    const result = await bks("create-tab query select 1");
    expect(result.json()).toEqual({ tabId: created.length });
  });

  it("switches to a tab by the id create-tab query printed", async () => {
    const tabId = (await bks("create-tab query")).json().tabId;
    const result = await bks(`switch-tab ${tabId}`);
    expect(result.error).toBeNull();
    expect(result.out).toBe("");
    expect((await bks("switch-tab 999")).error?.message).toContain(
      "Error (NOT_FOUND): No open tab with id 999.",
    );
  });

  it.each(["-v", "--version"])("prints the version: %s", async (flag) => {
    const result = await bks(flag);
    expect(result.out).toBe("1.2.3\n");
    expect(result.sent).toBe(false);
  });

  it("prints the result as one line of JSON by default and fails on an error reply", async () => {
    const result = await bks("schemas");
    expect(result.out.trimEnd()).not.toContain("\n");
    expect(JSON.parse(result.out)).toMatchObject({ schemas: [] });
    const missing = await bks("structure nothing");
    expect(missing.out).toBe("");
    expect(missing.error?.message).toContain("Error (NOT_FOUND)");
  });

  it("runs a query from its words", async () => {
    const result = (
      await bks("query select name from users order by id")
    ).json();
    expect(result.results[0].rows).toEqual([{ name: "Ann" }, { name: "Bob" }]);
  });

  it("needs sql for a query", async () => {
    const result = await bks("query");
    expect(result.err).toContain("query needs SQL");
    expect(result.sent).toBe(false);
  });

  it("rejects statements the client was not granted", async () => {
    const result = await bks("query delete from users");
    expect(result.error?.message).toContain("Error (NOT_PERMITTED)");
    const check = (await bks("query select count(*) as n from users")).json();
    expect(check.results[0].rows).toEqual([{ n: 2 }]);
  });

  it("prints markdown", async () => {
    const query = await bks("query select name from users order by id -f md");
    expect(query.out).toContain("## Result (SELECT, 2 rows)");
    expect(query.out).toMatch(/\| Ann +\|/);

    expect((await bks("connections -f md")).out).toMatch(/\| Local Dev +\|/);
    expect((await bks("entities -f md")).out).toMatch(/\| recent_users +\| view +\|/);
    const structure = (await bks("structure users -f md")).out;
    expect(structure).toContain("# users (table)");
    expect(structure).toContain("## Columns");
    expect(structure).toContain("## Primary key");
    expect(structure).toContain("```sql");
  });

  it("rejects an unknown format", async () => {
    const result = await bks("connections --format xml");
    expect(result.error?.code).toBe("commander.invalidArgument");
    expect(result.sent).toBe(false);
  });

  it.each(["--help", "help", "tables -h"])(
    "prints help: %s",
    async (command) => {
      const result = await bks(command);
      expect(result.error?.exitCode).toBe(0);
      expect(result.out).toContain("Usage: bks");
      expect(result.sent).toBe(false);
    },
  );

  it.each([
    ["frobnicate", "commander.unknownCommand"],
    ["tables --verbose", "commander.unknownOption"],
    ["connections extra", "commander.excessArguments"],
    ["connections --file x.sql", "commander.unknownOption"],
    ["tables -t table", "commander.unknownOption"],
  ])(
    "rejects bad usage without contacting the app: %s",
    async (command, code) => {
      const result = await bks(command);
      expect(result.error?.code).toBe(code);
      expect(result.sent).toBe(false);
    },
  );
});
