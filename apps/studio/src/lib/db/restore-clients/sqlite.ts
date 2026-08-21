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
    // Each option is one argv entry passed straight to spawn (no shell).
    // sqlite3 parses the dot-command itself, so the path is quoted for
    // sqlite — not for a shell.
    const command = new Command({
      isSql: false,
      mainCommand: this.mainCommand,
      options: [
        BaseCommandClient.databaseName,
        `.read ${BaseCommandClient.sqliteQuote(this.inputFilePath)}`
      ]
    });

    return command;
  }
}
