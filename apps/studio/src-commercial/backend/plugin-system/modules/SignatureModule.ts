import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Key } from "openpgp";
import globals from "@/common/globals";
import {
  Manifest,
  PluginDraft,
  PluginSnapshot,
  VerificationStatus,
} from "@/services/plugin";
import { Module, ModuleOptions } from "@/services/plugin/Module";
import { PluginError } from "@/lib/errors";
import rawLog from "@bksLogger";
import * as openpgp from "openpgp";

const log = rawLog.scope("SignatureModule");

interface VerificationResult {
  status: VerificationStatus;
  reason?: string;
}

interface SignaturePayload {
  schema: number;
  id: string;
  version: string;
  algorithm: string;
  files: Record<string, string>;
}

function computeFileHashes(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (current: string, relBase: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`Unsupported entry (not a regular file): ${rel}`);
      }
      if (
        rel === globals.plugins.signatureFilename ||
        rel === globals.plugins.signatureAscFilename
      ) {
        continue;
      }
      out[rel] = crypto
        .createHash("sha256")
        .update(fs.readFileSync(abs))
        .digest("hex");
    }
  };
  walk(dir, "");
  return out;
}

type SignatureOptions = {
  key: string;
};

export class SignatureModule extends Module {
  // runs before ConfigurationModule
  readonly priority: number = 100;

  private cachedKey?: Key | null;
  private readonly results = new Map<string, VerificationResult>();

  constructor(private readonly options: SignatureOptions & ModuleOptions) {
    super(options);
    this.hook("after-scan-plugins", this.verifyAll);
    this.hook("after-stage-plugin", this.verifyDownload);
    this.hook("plugin-snapshots", this.applySignatureState);
  }

  static with(options: SignatureOptions) {
    return class extends SignatureModule {
      constructor(baseOptions: ModuleOptions) {
        super({ ...baseOptions, ...options });
      }
    };
  }

  private async verify(id: string, dir: string): Promise<VerificationResult> {
    if (globals.plugins.ensureInstalled.find((plugin) => plugin.id === id)) {
      return { status: "trusted" };
    }
    return this.verifyDirectory(id, dir);
  }

  private async verifyAll(plugins: Manifest[]): Promise<void> {
    this.results.clear();
    for (const manifest of plugins) {
      if ((await this.manager.registry.originOf(manifest.id)) !== "official") {
        continue;
      }
      const dir = this.manager.fileManager.getDirectoryOf(manifest.id);
      this.results.set(manifest.id, await this.verify(manifest.id, dir));
    }
  }

  private async verifyDownload(draft: PluginDraft): Promise<void> {
    if ((await this.manager.registry.originOf(draft.id)) !== "official") {
      return;
    }
    const result = await this.verify(draft.id, draft.sourceDir);
    if (result.status !== "trusted") {
      throw new PluginError(
        "SIGNATURE_INVALID",
        `Plugin "${draft.id}" failed signature verification (${result.status}${
          result.reason ? `: ${result.reason}` : ""
        }).`
      );
    }
    this.results.set(draft.id, result);
  }

  private applySignatureState(snapshots: PluginSnapshot[]): PluginSnapshot[] {
    return snapshots.map((snapshot) => {
      if (snapshot.origin !== "official") {
        return snapshot;
      }

      const status = this.results.get(snapshot.manifest.id)?.status ?? "absent";
      const next: PluginSnapshot = { ...snapshot, verified: status };

      if (status !== "trusted") {
        next.origin = "unlisted";
      }
      if (status === "invalid" && !next.disableState.disabled) {
        next.disableState = { disabled: true, reason: "signature-invalid" };
      }

      return next;
    });
  }

  private async verifyDirectory(
    pluginId: string,
    dir: string
  ): Promise<VerificationResult> {
    const sigJsonPath = path.join(dir, globals.plugins.signatureFilename);
    const sigAscPath = path.join(dir, globals.plugins.signatureAscFilename);

    if (!fs.existsSync(sigJsonPath) || !fs.existsSync(sigAscPath)) {
      return { status: "absent" };
    }

    const key = await this.loadKey();
    if (!key) {
      log.warn(`No plugin signing key available; cannot verify "${pluginId}"`);
      return { status: "absent" };
    }

    const dataBytes = fs.readFileSync(sigJsonPath);
    const armoredSignature = fs.readFileSync(sigAscPath, "utf-8");

    try {
      const message = await openpgp.createMessage({
        binary: new Uint8Array(dataBytes),
      });
      const signature = await openpgp.readSignature({ armoredSignature });
      const result = await openpgp.verify({
        message,
        signature,
        verificationKeys: key,
      });
      await result.signatures[0].verified; // throws if it doesn't verify
    } catch (e) {
      log.warn(`Signature verification failed for "${pluginId}":`, e.message);
      return { status: "invalid", reason: "bad-signature" };
    }

    let payload: SignaturePayload;
    try {
      payload = JSON.parse(dataBytes.toString("utf-8"));
    } catch {
      return { status: "invalid", reason: "bad-payload" };
    }
    if (payload.id !== pluginId) {
      return { status: "invalid", reason: "id-mismatch" };
    }
    if (payload.algorithm && payload.algorithm !== "sha256") {
      return { status: "invalid", reason: "unsupported-algorithm" };
    }

    let onDisk: Record<string, string>;
    try {
      onDisk = computeFileHashes(dir);
    } catch (e) {
      log.warn(`Failed to hash plugin "${pluginId}":`, e.message);
      return { status: "invalid", reason: "unhashable" };
    }
    const listed = payload.files || {};

    for (const [rel, expected] of Object.entries(listed)) {
      if (onDisk[rel] !== expected) {
        return { status: "invalid", reason: `hash-mismatch:${rel}` };
      }
    }
    for (const rel of Object.keys(onDisk)) {
      if (!(rel in listed)) {
        return { status: "invalid", reason: `unlisted-file:${rel}` };
      }
    }

    return { status: "trusted" };
  }

  private async loadKey(): Promise<Key | null> {
    if (this.cachedKey !== undefined) {
      return this.cachedKey;
    }
    try {
      const armored = this.options.key;
      if (!armored || !armored.includes("BEGIN PGP PUBLIC KEY")) {
        this.cachedKey = null;
      } else {
        this.cachedKey = await openpgp.readKey({ armoredKey: armored });
      }
    } catch (e) {
      log.warn("Failed to load plugin signing key:", e.message);
      this.cachedKey = null;
    }
    return this.cachedKey;
  }
}
