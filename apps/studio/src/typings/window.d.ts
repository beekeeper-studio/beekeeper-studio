import type { IBkConfigHandler } from "@/lib/config/configLoader";

declare global {
  interface Window {
    BkConfig: IBkConfigHandler;
  }
}
