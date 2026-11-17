import { EventEmitter } from "events";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// here because the handlers read state(sId).server directly.
vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }));

import { ConnHandlers } from "@commercial/backend/handlers/connHandlers";
import { newState, removeState, state } from "@/handlers/handlerState";

const SID = "conn-change-db-test";

function makeClient() {
  const connector = new EventEmitter();
  return {
    connectionType: "postgresql",
    connector,
    connect: vi.fn(async () => undefined),
  };
}

describe("conn/changeDatabase and conn/clearConnection", () => {
  let dbMap: Map<string, ReturnType<typeof makeClient>>;
  let mockServer: {
    db: ReturnType<typeof vi.fn>;
    createConnection: ReturnType<typeof vi.fn>;
    destroyConnection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dbMap = new Map();
    mockServer = {
      db: vi.fn((name: string) => dbMap.get(name)),
      createConnection: vi.fn((name: string) => {
        const client = makeClient();
        dbMap.set(name, client);
        return client;
      }),
      destroyConnection: vi.fn((name: string) => {
        dbMap.delete(name);
      }),
    };

    newState(SID);
    state(SID).server = mockServer as any;
    state(SID).port = { postMessage: vi.fn() } as any;
  });

  afterEach(async () => {
    await removeState(SID);
  });

  it("connects to a new database and wires connection-lost on connector", async () => {
    await ConnHandlers["conn/changeDatabase"]({ newDatabase: "analytics", sId: SID });

    const client = dbMap.get("analytics");
    expect(client).toBeDefined();
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(state(SID).connection).toBe(client);
    expect(state(SID).database).toBe("analytics");

    client.connector.emit("connection-lost");
    expect(state(SID).port.postMessage).toHaveBeenCalledWith({ type: "conn/connection-lost" });
  });

  it("reuses an existing database connection without reconnecting", async () => {
    const existing = makeClient();
    dbMap.set("reporting", existing);

    await ConnHandlers["conn/changeDatabase"]({ newDatabase: "reporting", sId: SID });

    expect(mockServer.createConnection).not.toHaveBeenCalled();
    expect(existing.connect).not.toHaveBeenCalled();
    expect(state(SID).connection).toBe(existing);
    expect(state(SID).database).toBe("reporting");
  });

  it("destroys the connection and wraps the error if connect fails", async () => {
    mockServer.createConnection.mockImplementationOnce(() => ({
      connector: new EventEmitter(),
      connect: vi.fn(async () => {
        throw new Error("auth failed");
      }),
    }));

    await expect(
      ConnHandlers["conn/changeDatabase"]({ newDatabase: "broken", sId: SID })
    ).rejects.toThrow("Could not connect to database: auth failed");

    expect(mockServer.destroyConnection).toHaveBeenCalledWith("broken");
  });

  it("removes connector listeners and resets state on conn/clearConnection", async () => {
    await ConnHandlers["conn/changeDatabase"]({ newDatabase: "analytics", sId: SID });
    const client = dbMap.get("analytics");
    const port = state(SID).port;

    expect(client.connector.listenerCount("connection-lost")).toBe(1);

    await ConnHandlers["conn/clearConnection"]({ sId: SID });

    expect(client.connector.listenerCount("connection-lost")).toBe(0);
    expect(state(SID).connection).toBeNull();
    expect(state(SID).server).toBeNull();
    expect(state(SID).database).toBeNull();

    client.connector.emit("connection-lost");
    expect(port.postMessage).not.toHaveBeenCalled();
  });

  it("clears state safely on conn/clearConnection even if connector is absent", async () => {
    state(SID).connection = { disconnect: vi.fn() } as any;

    await ConnHandlers["conn/clearConnection"]({ sId: SID });

    expect(state(SID).connection).toBeNull();
    expect(state(SID).server).toBeNull();
  });
});
