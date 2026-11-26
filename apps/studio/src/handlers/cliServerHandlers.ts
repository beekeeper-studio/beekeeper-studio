import { state } from "@/handlers/handlerState";
import type { CliAccess } from "@beekeeperstudio/cli";

export interface AuthorizedClientSnapshot {
  name: string;
  access: CliAccess;
}

export interface ICliServerHandlers {
  "cliServer/authorizedClients": (args: { sId: string; }) => Promise<AuthorizedClientSnapshot[]>;
}

export const CliServerHandlers: ICliServerHandlers = {
  "cliServer/authorizedClients": async function ({ sId }) {
    const grants = state(sId)?.cliClients;
    if (!grants) {
      return [];
    }
    return Array.from(grants.values());
  },
};
