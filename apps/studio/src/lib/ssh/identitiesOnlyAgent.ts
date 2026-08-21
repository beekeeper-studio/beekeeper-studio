import { OpenSSHAgent, PageantAgent, BaseAgent } from "ssh2";
import rawLog from "@bksLogger";

const log = rawLog.scope("ssh:identities-only-agent");

interface AgentLike {
  getIdentities(cb: (err: Error | null, keys?: any[]) => void): void;
}

/**
 * Filter the agent's identity list to those whose public key blob matches
 * one of the provided allowed keys. This mirrors OpenSSH's IdentitiesOnly
 * behavior: the agent is still queried, but only offers identities the user
 * has explicitly authorized via `IdentityFile`.
 *
 * If `allowedPublicKeys` is empty (e.g. all IdentityFile reads failed), the
 * filter is a no-op — falling back to the agent's full identity list is the
 * safer default.
 */
export function createFilteringAgent(opts: {
  socketPath?: string;
  isWindows: boolean;
  allowedPublicKeys: Set<string>;
}): BaseAgent {
  const { socketPath, isWindows, allowedPublicKeys } = opts;

  if (allowedPublicKeys.size === 0) {
    log.warn(
      "IdentitiesOnly requested but no public keys were resolvable; using agent without filtering"
    );
  }

  const filter = (
    agent: AgentLike,
    cb: (err: Error | null, keys?: any[]) => void
  ) => {
    agent.getIdentities((err, keys) => {
      if (err) return cb(err);
      if (!Array.isArray(keys) || allowedPublicKeys.size === 0) {
        return cb(null, keys);
      }
      const filtered = keys.filter((key) => {
        try {
          const blob = key.getPublicSSH();
          return allowedPublicKeys.has(blob.toString("base64"));
        } catch {
          return false;
        }
      });
      cb(null, filtered);
    });
  };

  if (isWindows && !socketPath) {
    class FilteringPageantAgent extends PageantAgent {
      getIdentities(cb: (err: Error | null, keys?: any[]) => void) {
        filter(
          { getIdentities: (c) => super.getIdentities(c) },
          cb
        );
      }
    }
    return new (FilteringPageantAgent as any)();
  }

  class FilteringOpenSSHAgent extends OpenSSHAgent {
    getIdentities(cb: (err: Error | null, keys?: any[]) => void) {
      filter(
        { getIdentities: (c) => super.getIdentities(c) },
        cb
      );
    }
  }
  return new FilteringOpenSSHAgent(socketPath);
}
