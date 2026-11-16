import _ from 'lodash';
import ini from "ini";
import BksConfig from '@/common/bksConfig';
import { loadConfig, resolveConfigDir } from '@/common/bksConfig/mainBksConfig';
import platformInfo from "@/common/platform_info";
import path from 'path';
import { writeFileSync } from 'fs';

// TODO (@day): idk if this needs to be a class, gonna leave it for now
export class ConfigWriter {

  private configName: string = "user.config.ini";

  constructor() {
    if (platformInfo.isDevelopment) {
      this.configName = "local.config.ini";
    }
  }

  get configPath(): string {
    const dirPath = resolveConfigDir();
    return path.join(dirPath, this.configName);
  }

  write(path: string, value: any) {
    if (!BksConfig.userCanOverride(path)) {
      throw new Error('Value is set in system.config.ini');
    }

    let userConfig = loadConfig(this.configName, true);

    userConfig = _.set(userConfig, path, value);

    // @ts-ignore
    const fileContents = ini.stringify(userConfig, { preserveComments: true });

    writeFileSync(this.configPath, fileContents);
  }
}
