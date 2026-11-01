import BksConfig, { reloadBksConfig } from "@/common/bksConfig";
import { ConfigWriter } from "@/config/configWriter"
import { pluginManager } from "./handlerState";

export interface IConfigHandlers {
  "config/writeUserValue": ({ path, value }: { path: string, value: any }) => Promise<void>,
  "config/reload": () => Promise<void>,
}

export const ConfigHandlers: IConfigHandlers = {
    "config/writeUserValue": async function({ path, value }: { path: string; value: any; }): Promise<void> {
        const writer = new ConfigWriter();

        writer.write(path, value);

        reloadBksConfig();
        await pluginManager.triggerConfigReload();
        process.parentPort.postMessage({ type: "configChanged", source: BksConfig.source })
    },
    "config/reload": async function(): Promise<void> {
        reloadBksConfig();
        await pluginManager.triggerConfigReload();
        process.parentPort.postMessage({ type: "configChanged", source: BksConfig.source })
    }
}
