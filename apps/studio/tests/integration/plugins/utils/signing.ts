import * as openpgp from "openpgp";
import crypto from "crypto";

export interface TestKeyPair {
  publicKey: string;
  privateKey: string;
}

/** Generate a throwaway OpenPGP keypair for signing test plugins. */
export async function generateTestKeyPair(): Promise<TestKeyPair> {
  const { publicKey, privateKey } = await openpgp.generateKey({
    userIDs: [{ name: "BKS Test", email: "test@beekeeperstudio.io" }],
    format: "armored",
  });
  return { publicKey, privateKey };
}

export interface BuildSignatureOptions {
  id: string;
  version: string;
  /** POSIX-relative path -> file contents (excluding the signature files). */
  files: Record<string, Buffer>;
  privateKey: string;
  /** Override the id written into the payload (for transplant/wrong-id tests). */
  overrideId?: string;
}

/**
 * Build the signed integrity payload (`signature.json`) and its detached
 * armored OpenPGP signature (`signature.json.asc`) for a set of files, matching
 * what {@link SignatureModule} expects.
 */
export async function buildSignatureFiles(
  opts: BuildSignatureOptions
): Promise<{ signatureJson: string; signatureAsc: string }> {
  const fileHashes: Record<string, string> = {};
  for (const [rel, content] of Object.entries(opts.files)) {
    fileHashes[rel] = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");
  }

  const payload = {
    schema: 1,
    id: opts.overrideId ?? opts.id,
    version: opts.version,
    algorithm: "sha256",
    files: fileHashes,
  };
  const signatureJson = JSON.stringify(payload);

  const privateKey = await openpgp.readPrivateKey({
    armoredKey: opts.privateKey,
  });
  const message = await openpgp.createMessage({
    binary: new TextEncoder().encode(signatureJson),
  });
  const signatureAsc = await openpgp.sign({
    message,
    signingKeys: privateKey,
    detached: true,
    format: "armored",
  });

  return { signatureJson, signatureAsc: signatureAsc as string };
}
