import { BackupConfig } from "../models/BackupConfig";
import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command, CommandSettingSection } from "../models";

export class SqliteBackupClient extends BaseCommandClient {
  defaultFileType = '.sql';

  constructor() {
    super('sqlite3');
  }

  get settingsSections(): CommandSettingSection[] {
    return [
      this.binaryLocation,
      {
        header: 'sqlite3 .dump Options',
        show: (config: BackupConfig): boolean => {
          return config.dumpToolPath && config.dumpToolPath.includes(this.toolName);
        },
        controls: [
          {
            controlType: 'info',
            settingDesc: 'For information regarding these options, please visit the',
            infoLink: 'https://sqlite.org/cli.html',
            infoLinkText: 'sqlite cli documentation'
          },
          {
            controlType: 'checkbox',
            settingName: 'dataOnly',
            settingDesc: 'Output only INSERT statements',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'newlines',
            settingDesc: 'Allow unescaped newline characters in output',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'nosys',
            settingDesc: 'Omit system tables (ex: "sqlite_stat1")',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'preserveRowIds',
            settingDesc: 'Include ROWID values in the output',
            required: false
          },
        ]
      },
      this.fileSettings,
    ];
  }
  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: true,
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
      mainCommand: this._config.dumpToolPath,
      options: [
        BaseCommandClient.databaseName,
        `".output ${this._config.outputPath}${this.pathSep}${this.filename}"`,
        `".trace stdout"`
      ]
    });
    const dumpCommand: string[] = [`".dump`];

    if (this._config.dataOnly) {
      dumpCommand.push(`--data-only`);
    }

    if (this._config.newlines) {
      dumpCommand.push(`--newlines`);
    }

    if (this._config.nosys) {
      dumpCommand.push(`--nosys`);
    }

    if (this._config.preserveRowIds) {
      dumpCommand.push(`--preserve-rowids`);
    }

    if (this._config.includeTables && this._config.includeTables.length > 0) {
      this._config.includeTables.forEach((x) => {
        dumpCommand.push(x);
      });
    }

    dumpCommand.push('"');

    command.options.push(dumpCommand.join(' '));

    return command;
  }
}
