import { BkConfig } from "@/lib/bkConfig";

declare global {
  interface Window {
    BkConfig: typeof BkConfig;
  }
}
