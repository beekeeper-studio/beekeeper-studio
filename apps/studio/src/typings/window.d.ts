import type { IBkConfigHandler } from "@/lib/config/config-loader";

declare global {
  interface Window {
    BkConfig: IBkConfigHandler;
  }
}
