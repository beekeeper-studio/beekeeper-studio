import {
  respondRendererRequest,
  RendererResponse,
} from "@/services/cliServer/rendererRequests";
import { state } from "@/handlers/handlerState";
import type { CliAccess } from "@beekeeperstudio/cli-client";

export interface AuthorizedCliClient {
  name: string;
  access: CliAccess;
}

export interface ICliServerHandlers {
  "cliServer/respond": (response: RendererResponse & { sId: string }) => Promise<void>;
  "cliServer/authorizedClients": (args: { sId: string; }) => Promise<AuthorizedCliClient[]>;
}

/** Renderers respond to the CLI server's requests through these. */
export const CliServerHandlers: ICliServerHandlers = {
  "cliServer/respond": async function ({ requestId, result, error }) {
    respondRendererRequest({ requestId, result, error });
  },
  "cliServer/authorizedClients": async function ({ sId }) {
    const grants = state(sId)?.cliClients;
    if (!grants) {
      return [];
    }
    return Array.from(grants.values());
  },
};
