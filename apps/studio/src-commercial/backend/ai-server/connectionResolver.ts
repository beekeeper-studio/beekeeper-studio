import os from "os";
import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { state, newState } from "@/handlers/handlerState";
import { ConnHandlers } from "../handlers/connHandlers";
import { AiServerConnectionGrant } from "./types";
import { getSession, makeSId, rememberSession } from "./sessionRegistry";
import { loadOptions } from "./options";
import rawLog from "@bksLogger";

const log = rawLog.scope("ai-server:connection");

const OS_USER = process.env.USER || process.env.USERNAME || os.userInfo?.()?.username || "ai-server";

export class AiConnectionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function resolveSession(
  tokenPrefix: string,
  grant: AiServerConnectionGrant
): Promise<{ sId: string; connection: SavedConnection; readOnly: boolean }> {
  const saved = await SavedConnection.findOneBy({ id: grant.connectionId });
  if (!saved) throw new AiConnectionError("connection not found", 404);

  // Write access is a single server-wide setting shared by every client.
  // The per-connection grant flag stays in the data model but is no longer
  // the enforcement point — `allowWrites` is the authority.
  const options = await loadOptions();
  const readOnly = !options.allowWrites;

  const existing = getSession(tokenPrefix, grant.connectionId);
  if (existing && state(existing)?.connection) {
    return { sId: existing, connection: saved, readOnly };
  }

  const sId = makeSId(tokenPrefix, grant.connectionId);
  newState(sId);

  // Apply the read-only flag to the in-memory config we hand to conn/create.
  // SavedConnection extends DbConnectionBase which carries readOnlyMode; copying
  // ensures we don't mutate the persisted entity.
  const config = saved.withProps();
  config.readOnlyMode = readOnly;

  try {
    await ConnHandlers["conn/create"]({
      config,
      osUser: OS_USER,
      sId,
    });
  } catch (e) {
    log.error("conn/create failed for ai session", sId, e);
    throw new AiConnectionError(`failed to connect: ${(e as Error).message}`, 502);
  }

  rememberSession(tokenPrefix, grant.connectionId, sId);
  return { sId, connection: saved, readOnly };
}
