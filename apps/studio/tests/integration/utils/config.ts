import { BksConfigProvider } from "@/common/bksConfig/BksConfigProvider";
import platformInfo from "@/common/platform_info";
import { parseIni, processRawConfig } from "@/config/helpers";
import defaultConfigIni from "../../../default.config.ini";

/**
 * Create a BksConfig from a config string.
 *
 * @example
 * ```js
 * const bksConfig = createBksConfig(`
 *   [pluginSystem]
 *   disabled = true
 * `);
 * bksConfig.get("pluginSystem.disabled"); // true
 **/
export function createConfig(text: string) {
  return BksConfigProvider.create(
    {
      // @ts-expect-error should match the type
      defaultConfig: processRawConfig(parseIni(defaultConfigIni)),
      userConfig: processRawConfig(parseIni(removeLeadingWhitespace(text))),
      systemConfig: {},
      warnings: [],
    },
    platformInfo
  );
}

function removeLeadingWhitespace(text: string) {
  return text
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n");
}
