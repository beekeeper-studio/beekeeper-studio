import { UserSetting, UserSettingValueType } from "@/common/appdb/models/user_setting";
import { AiServerGrants, AiServerConnectionGrant, EMPTY_GRANTS } from "./types";

const KEY = "aiServerGrants";

function normalize(raw: unknown): AiServerGrants {
  const r = (raw ?? {}) as Partial<AiServerGrants>;
  return {
    connections: Array.isArray(r.connections)
      ? r.connections.filter((c) => c && typeof c.connectionId === "number").map((c) => ({
          connectionId: c.connectionId,
          readOnly: c.readOnly !== false,
          maxRows: typeof c.maxRows === "number" && c.maxRows > 0 ? c.maxRows : undefined,
        }))
      : [],
    queries: Array.isArray(r.queries) ? r.queries.filter((q) => typeof q === "number") : [],
    workspaceIds: Array.isArray(r.workspaceIds)
      ? r.workspaceIds.filter((w) => typeof w === "number")
      : [],
  };
}

export async function loadGrants(): Promise<AiServerGrants> {
  const setting = await UserSetting.get(KEY);
  if (!setting || setting.value == null) return { ...EMPTY_GRANTS, connections: [], queries: [], workspaceIds: [] };
  return normalize(setting.value);
}

export async function saveGrants(grants: AiServerGrants): Promise<AiServerGrants> {
  const cleaned = normalize(grants);
  let setting = await UserSetting.get(KEY);
  if (!setting) {
    setting = new UserSetting();
    setting.key = KEY;
    setting.valueType = UserSettingValueType.object;
    setting.defaultValue = JSON.stringify({ connections: [], queries: [], workspaceIds: [] });
  } else if (setting.valueType !== UserSettingValueType.object) {
    setting.valueType = UserSettingValueType.object;
  }
  setting.value = cleaned as unknown as Record<string, unknown>;
  await setting.save();
  return cleaned;
}

export function findConnectionGrant(
  grants: AiServerGrants,
  connectionId: number
): AiServerConnectionGrant | null {
  return grants.connections.find((g) => g.connectionId === connectionId) ?? null;
}

export function isConnectionAllowed(grants: AiServerGrants, connectionId: number): boolean {
  return !!findConnectionGrant(grants, connectionId);
}

export function isQueryAllowed(grants: AiServerGrants, queryId: number): boolean {
  return grants.queries.includes(queryId);
}

export function workspaceFilter(grants: AiServerGrants): number[] | null {
  return grants.workspaceIds.length > 0 ? grants.workspaceIds : null;
}
