import { RpcClient } from "../src/RpcClient";
import { CancelError, CliError } from "../src/protocol";
import type { CallContext } from "../src/protocol";
import { RpcServer } from "../src/RpcServer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Basic RPC Tests", () => {
  let serverPort: MessagePort;
  let clientPort: MessagePort;
  let client: RpcClient;
  let server: RpcServer;

  beforeEach(() => {
    const channel = new MessageChannel();
    serverPort = channel.port1;
    clientPort = channel.port2;

    server = new RpcServer(serverPort);
    server.initialize();

    client = new RpcClient(clientPort);
  });

  afterEach(() => {
    serverPort.close();
    clientPort.close();
  });

  it("successfully replies to requests", async () => {
    server.register("ping", () => "pong");
    await expect(client.request("ping")).resolves.toBe("pong");
  });

  it("cancels a request by id", async () => {
    server.register("ping", () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve("pong"), 10_000);
      });
    });

    const promise = client.request("ping", {}, { id: "id-123" });
    client.cancel("id-123");
    await expect(promise).rejects.toBeInstanceOf(CancelError);
  });

  // The use case for this is when the process exits and there are
  // still running requests.
  it("cancels all requests", async () => {
    const resolvers = Promise.withResolvers<void>();
    server.register("ping", () => resolvers.promise);

    const requests = [client.request("ping"), client.request("ping")];
    // Let both requests reach the server before cancelling
    await new Promise((resolve) => setTimeout(resolve, 0));
    server.cancelAll("The window was closed.");

    await expect(requests[0]).rejects.toBeInstanceOf(CancelError);
    await expect(requests[0]).rejects.toThrow("The window was closed.");
    await expect(requests[1]).rejects.toBeInstanceOf(CancelError);
    await expect(requests[1]).rejects.toThrow("The window was closed.");
  });

  it("accepts a payload", async () => {
    server.register(
      "greet",
      (payload: { name: string }) => `hello ${payload.name}`,
    );
    await expect(client.request("greet", { name: "bob" })).resolves.toBe(
      "hello bob",
    );
  });

  it("throws an error when a request is unknown", async () => {
    const pong = () => "pong";
    server.register("ping", pong);
    server.unregister("ping", pong);

    await expect(client.request("ping")).rejects.toThrow(
      'Unknown method "ping".',
    );
  });

  it("throws an error when a request fails", async () => {
    server.register("ping", () => {
      throw "something broke";
    });
    const promise = client.request("ping");
    await expect(promise).rejects.toThrow("something broke");
  });

  it("throws a custom error", async () => {
    class PingError extends Error {
      code = "PING_FAILED";
    }

    server.register("ping", () => {
      throw new PingError("ping failed");
    });

    const promise = client.request("ping");
    await expect(promise).rejects.toThrow("ping failed");
    await expect(promise).rejects.toMatchObject({ code: "PING_FAILED" });
  });

  it("passes the request and a signal to the handler", async () => {
    server.register("echo", (_args: unknown, context: CallContext) => ({
      name: context.request?.name,
      aborted: context.signal.aborted,
    }));
    await expect(client.request("echo")).resolves.toEqual({
      name: "echo",
      aborted: false,
    });
  });

  it("replies with the hint and details of an error", async () => {
    server.register("ping", () => {
      throw new CliError("NOT_FOUND", "nope", {
        hint: "look elsewhere",
        details: { tried: 1 },
      });
    });
    const replies: unknown[] = [];
    clientPort.addEventListener("message", (event) => replies.push(event.data));

    await expect(client.request("ping")).rejects.toThrow("nope");
    expect(replies.at(-1)).toMatchObject({
      type: "response",
      input: { errorHint: "look elsewhere", errorDetail: { tried: 1 } },
    });
  });

  it("rejects with a CliError that keeps its code, hint and details", async () => {
    server.register("ping", () => {
      throw new CliError("NOT_FOUND", "nope", {
        hint: "look elsewhere",
        details: { tried: 1 },
      });
    });

    const promise = client.request("ping");
    await expect(promise).rejects.toBeInstanceOf(CliError);
    await expect(promise).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "nope",
      hint: "look elsewhere",
      details: { tried: 1 },
    });
  });

  it("internally add listener only when needed", async () => {
    const { resolve: pong, promise } = Promise.withResolvers<void>();
    server.register("ping", () => promise);

    expect(client.getListenerCount()).toBe(0);
    const requests = [
      client.request("ping"),
      client.request("ping"),
      client.request("ping"),
    ];
    expect(client.getListenerCount()).toBe(3);

    pong();
    await Promise.all(requests);

    expect(client.getListenerCount()).toBe(0);
  });
});
