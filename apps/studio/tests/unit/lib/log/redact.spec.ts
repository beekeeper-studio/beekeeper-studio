import { redact, isSensitiveKey } from "@/lib/log/redact";

describe("isSensitiveKey", () => {
  it.each([
    "password",
    "Password",
    "passphrase",
    "privateKey",
    "private_key",
    "bastionPassword",
    "bastionPassphrase",
    "bastionPrivateKey",
    "token",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "idToken",
    "authToken",
    "apiKey",
    "api_key",
    "clientSecret",
    "client_secret",
    "secret",
    "credentials",
    "credential",
    "authorization",
    "Authorization",
    "cookie",
    "sessionId",
    "session_id",
    "licenseKey",
    "license_key",
    "keyFilename",
    "keyFile",
    "serviceAccount",
    "service_account",
  ])("treats %s as sensitive", (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each([
    "host",
    "port",
    "user",
    "username",
    "database",
    "id",
    "name",
    "url",
    "method",
    "status",
    "publicKey",
    "primaryKey",
    "keyboard",
    "keystroke",
  ])("treats %s as non-sensitive", (key) => {
    expect(isSensitiveKey(key)).toBe(false);
  });
});

describe("redact", () => {
  it("returns primitives unchanged", () => {
    expect(redact("hello")).toBe("hello");
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });

  it("redacts sensitive top-level fields", () => {
    const input = {
      host: "db.example.com",
      port: 5432,
      user: "alice",
      password: "hunter2",
    };
    expect(redact(input)).toEqual({
      host: "db.example.com",
      port: 5432,
      user: "alice",
      password: "[REDACTED]",
    });
  });

  it("does not mutate the input object", () => {
    const input = { password: "hunter2", user: "alice" };
    redact(input);
    expect(input.password).toBe("hunter2");
  });

  it("redacts SSH options with passphrase and Buffer privateKey", () => {
    const input = {
      endHost: "10.0.0.1",
      endPort: 22,
      username: "root",
      passphrase: "supersecret",
      privateKey: Buffer.from("-----BEGIN OPENSSH PRIVATE KEY-----..."),
      keepaliveInterval: 60,
    };
    const out = redact(input) as Record<string, unknown>;
    expect(out.endHost).toBe("10.0.0.1");
    expect(out.username).toBe("root");
    expect(out.passphrase).toBe("[REDACTED]");
    expect(out.privateKey).toBe("[REDACTED]");
  });

  it("redacts nested objects", () => {
    const input = {
      server: {
        config: {
          host: "example.com",
          password: "shh",
          ssh: {
            user: "root",
            privateKey: "ABCDEF",
            passphrase: "yo",
          },
        },
      },
    };
    expect(redact(input)).toEqual({
      server: {
        config: {
          host: "example.com",
          password: "[REDACTED]",
          ssh: {
            user: "root",
            privateKey: "[REDACTED]",
            passphrase: "[REDACTED]",
          },
        },
      },
    });
  });

  it("redacts arrays of objects", () => {
    const input = [
      { name: "a", token: "t1" },
      { name: "b", token: "t2" },
    ];
    expect(redact(input)).toEqual([
      { name: "a", token: "[REDACTED]" },
      { name: "b", token: "[REDACTED]" },
    ]);
  });

  it("replaces raw Buffer with [REDACTED]", () => {
    expect(redact(Buffer.from("secret"))).toBe("[REDACTED]");
  });

  it("handles circular references without crashing", () => {
    const input: any = { name: "a", password: "p" };
    input.self = input;
    const out = redact(input) as any;
    expect(out.name).toBe("a");
    expect(out.password).toBe("[REDACTED]");
    expect(out.self).toBe("[Circular]");
  });

  it("preserves Error instances", () => {
    const err = new Error("boom");
    expect(redact(err)).toBe(err);
  });

  it("preserves Date and RegExp", () => {
    const d = new Date();
    const r = /foo/;
    expect(redact(d)).toBe(d);
    expect(redact(r)).toBe(r);
  });

  it("preserves class instances rather than traversing them", () => {
    class Thing {
      password = "secret";
      name = "thing";
    }
    const t = new Thing();
    // Class instance is returned as-is (we don't deep-clone arbitrary classes).
    expect(redact(t)).toBe(t);
  });

  it("preserves null values for sensitive keys", () => {
    expect(redact({ password: null, token: undefined })).toEqual({
      password: null,
      token: undefined,
    });
  });

  it("redacts axios-style request headers (plain object input)", () => {
    const headers = {
      email: "u@example.com",
      token: "abc123",
      authorization: "Bearer xyz",
      app: "beekeeper",
    };
    expect(redact(headers)).toEqual({
      email: "u@example.com",
      token: "[REDACTED]",
      authorization: "[REDACTED]",
      app: "beekeeper",
    });
  });
});
