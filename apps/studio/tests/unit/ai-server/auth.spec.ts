import { extractBearer, generateToken, verifyToken } from "@commercial/backend/ai-server/auth";

describe("ai-server/auth", () => {
  it("generateToken produces 64 hex chars", () => {
    const t = generateToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("extractBearer parses well-formed header", () => {
    expect(extractBearer("Bearer abc123")).toBe("abc123");
    expect(extractBearer("bearer  xyz  ")).toBe("xyz");
  });

  it("extractBearer returns null for invalid input", () => {
    expect(extractBearer(undefined)).toBeNull();
    expect(extractBearer("")).toBeNull();
    expect(extractBearer("Basic abc")).toBeNull();
    expect(extractBearer("Bearer")).toBeNull();
  });

  it("verifyToken rejects mismatches and length differences", () => {
    const a = generateToken();
    const b = generateToken();
    expect(verifyToken(a, a)).toBe(true);
    expect(verifyToken(a, b)).toBe(false);
    expect(verifyToken(null, a)).toBe(false);
    expect(verifyToken("short", a)).toBe(false);
    expect(verifyToken(a, "")).toBe(false);
  });
});
