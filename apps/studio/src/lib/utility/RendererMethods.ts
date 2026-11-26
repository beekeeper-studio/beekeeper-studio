import type {
  Access,
  CallContext,
  CreateTabRequest,
} from "@beekeeperstudio/rpc";
import type { ApprovalRequester } from "@beekeeperstudio/rpc";

/** Methods a renderer registers on UtilityConnection, for the utility process to call. */
export interface RendererMethods {
  "cli/createTab": (
    params: CreateTabRequest,
    context: CallContext,
  ) => Promise<number>;
  "cli/switchTab": (
    params: { tabId: number },
    context: CallContext,
  ) => Promise<void>;
  "cli/requestApproval": (
    params: ApprovalRequester,
    context: CallContext,
  ) => Promise<Access>;
}
