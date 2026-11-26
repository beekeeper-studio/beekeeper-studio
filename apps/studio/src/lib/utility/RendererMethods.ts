import type { CliAccess, CliCreateTabRequest } from "@beekeeperstudio/cli";
import type { ApprovalRequester } from "@beekeeperstudio/cli";

/** Methods a renderer registers on UtilityConnection, for the utility process to call. */
export interface RendererMethods {
  "cli/createTab": (params: CliCreateTabRequest, signal: AbortSignal) => Promise<number>;
  "cli/switchTab": (params: { tabId: number }, signal: AbortSignal) => Promise<void>;
  "cli/requestApproval": (
    params: ApprovalRequester,
    signal: AbortSignal,
  ) => Promise<CliAccess>;
}
