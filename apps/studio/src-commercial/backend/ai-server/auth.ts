import { randomBytes, timingSafeEqual } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function extractBearer(authHeader: string | undefined | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authHeader);
  return match ? match[1] : null;
}

export function verifyToken(presented: string | null, expected: string): boolean {
  if (!presented || !expected) return false;
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
