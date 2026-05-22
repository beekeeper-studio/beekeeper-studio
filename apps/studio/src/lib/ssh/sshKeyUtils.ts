import fs from "fs";
import { utils as ssh2Utils } from "ssh2";
import rawLog from "@bksLogger";

const log = rawLog.scope("ssh:key-utils");

/**
 * For each IdentityFile path, return the SSH wire-format public key encoded
 * as base64 (suitable for set membership comparison against agent identities).
 *
 * Tries `${path}.pub` first; falls back to deriving the public key from the
 * private key file via ssh2's parseKey. Files that fail to load (missing,
 * encrypted with no passphrase, unsupported format) are logged and skipped.
 */
export function loadAllowedPublicKeys(
  identityFiles: string[],
  passphrase?: string
): Set<string> {
  const result = new Set<string>();
  for (const filePath of identityFiles) {
    const blob = readPublicKeyBlob(filePath, passphrase);
    if (blob) {
      result.add(blob.toString("base64"));
    }
  }
  return result;
}

function readPublicKeyBlob(
  filePath: string,
  passphrase?: string
): Buffer | null {
  const pubPath = `${filePath}.pub`;
  if (fs.existsSync(pubPath)) {
    try {
      const data = fs.readFileSync(pubPath);
      const parsed = ssh2Utils.parseKey(data);
      if (parsed instanceof Error) {
        log.warn(`Failed to parse ${pubPath}: ${parsed.message}`);
      } else {
        const key = Array.isArray(parsed) ? parsed[0] : parsed;
        return key.getPublicSSH();
      }
    } catch (err) {
      log.warn(`Failed to read ${pubPath}: ${err.message}`);
    }
  }

  if (!fs.existsSync(filePath)) {
    log.warn(`IdentityFile not found: ${filePath}`);
    return null;
  }

  try {
    const data = fs.readFileSync(filePath);
    const parsed = ssh2Utils.parseKey(data, passphrase);
    if (parsed instanceof Error) {
      log.warn(
        `Cannot derive public key from ${filePath}: ${parsed.message}`
      );
      return null;
    }
    const key = Array.isArray(parsed) ? parsed[0] : parsed;
    return key.getPublicSSH();
  } catch (err) {
    log.warn(`Failed to read ${filePath}: ${err.message}`);
    return null;
  }
}
