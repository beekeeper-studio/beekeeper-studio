import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command, CommandSettingSection } from "../models";

export class SqliteRestoreClient extends BaseCommandClient {
  constructor() {
    super('sqlite3');
    this.mode = 'restore';
  }

  get settingsSections(): CommandSettingSection[] {
    return [
      this.fileSettings,
      this.binaryLocation,
    ]
  }

  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: false,
      settings: true,
    };
  }
  processLog(chunk: any): string[] {
    const str: string = chunk.toString();

    return str.split('\n').map((s) => s.trim()).filter((s) => s != "" && !!s);
  }
  buildCommand(): Command {
    const command = new Command({
      isSql: false,
      mainCommand: this.mainCommand,
      options: [
        BaseCommandClient.databaseName,
        `".read ${this._config.inputPath}"`
      ]
    });

    return command;
  }
}
