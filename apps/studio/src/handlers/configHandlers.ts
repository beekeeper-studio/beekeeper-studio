import BksConfig, { reloadBksConfig } from "@/common/bksConfig";
import { ConfigWriter } from "@/config/configWriter"

export interface IConfigHandlers {
  "config/writeUserValue": ({ path, value }: { path: string, value: any }) => Promise<void>,
  "config/reload": () => Promise<void>,
}

export const ConfigHandlers: IConfigHandlers = {
    "config/writeUserValue": async function({ path, value }: { path: string; value: any; }): Promise<void> {
        const writer = new ConfigWriter();

        writer.write(path, value);

        reloadBksConfig();
        process.parentPort.postMessage({ type: "configChanged", source: BksConfig.source })
    },
    "config/reload": async function(): Promise<void> {
        reloadBksConfig();
        process.parentPort.postMessage({ type: "configChanged", source: BksConfig.source })
    }
}
