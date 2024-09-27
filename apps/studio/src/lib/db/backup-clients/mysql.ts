import { BackupConfig } from "../models/BackupConfig";
import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command, CommandSettingSection } from "../models";

export class MySqlBackupClient extends BaseCommandClient {
  defaultFileType = '.sql';

  constructor(toolName: string) {
    super(toolName);
    this.allowedTools = ['mysqldump', 'mariadb-dump']
  }

  get settingsSections(): CommandSettingSection[] {
    // set defaults for mysql backup
    if (this._config.insertIgnore == null) {
      this._config.insertIgnore = true;
    }

    return [
      this.binaryLocation,
      {
        header: `${this.toolName} Options`,
        show: (config: BackupConfig): boolean => {
          return config.dumpToolPath && config.dumpToolPath.includes(this.toolName);
        },
        controls: [
          // NOTE: I (day) have made the executive decision not to support delimited text at release, so we are only going to do plain text :)
          // {
          //   controlType: 'select',
          //   settingName: 'format',
          //   settingDesc: 'Format',
          //   selectOptions: [
          //     { name: 'Plain', value: 'p' },
          //     { name: 'Delimited-Text', value: 'd' }
          //   ],
          //   placeholder: 'Select a format...',
          //   required: true
          // },
          {
            controlType: 'info',
            settingDesc: 'For information regarding these options, please visit the',
            infoLink: 'https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html',
            infoLinkText: `${this.toolName} documentation.`
          },
          {
            controlType: 'checkbox',
            settingName: 'insertIgnore',
            settingDesc: 'Write INSERT IGNORE rather than INSERT statements',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'sqlInsert',
            settingDesc: 'Use complete INSERT statements that include column names',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'replaceInto',
            settingDesc: 'Write REPLACE statements rather than INSERT statements',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'dropDatabase',
            settingDesc: 'Add DROP DATABASE before each CREATE DATABASE statement',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'createDatabase',
            settingDesc: 'Do not write CREATE DATABASE statements',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'schemaOnly',
            settingDesc: 'Do not dump table contents',
            required: false,
            show: (config: BackupConfig): boolean => {
              return !config.dataOnly;
            }
          },
          {
            controlType: 'checkbox',
            settingName: 'dataOnly',
            settingDesc: 'Dump only the data, not the schema',
            required: false,
            show: (config: BackupConfig): boolean => {
              return !config.schemaOnly
            }
          },
        ]
      },
      this.fileSettings,
      this.customSettings
    ];
  }

  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: true,
      settings: true,
    }
  }
  processLog(chunk: any): string[] {
    return [chunk.toString()];
  }
  buildCommand(): Command {
    const command = new Command({
      isSql: false,
      env: {
      },
      mainCommand: this.mainCommand,
      options: [
        `--verbose`,
        `--user=${BaseCommandClient.username}`,
        `--password=${BaseCommandClient.quotedPassword}`
      ]
    });

    if (BaseCommandClient.socketPathEnabled) {
      command.options.push(...[
        `--protocol=SOCKET`,
        `--socket=${BaseCommandClient.socket}`
      ]);
    } else {
      command.options.push(...[
        `--protocol=TCP`,
        `--host=${BaseCommandClient._localHost ?? BaseCommandClient.host}`,
        `--port=${BaseCommandClient._localPort ?? BaseCommandClient.port}`,
      ]);
    }

    if (BaseCommandClient.ssl) {
      command.options.push(...[
        '--ssl-mode=REQUIRED'
      ]);

      if (BaseCommandClient.sslCA) {
        command.options.push(`--ssl-ca=${BaseCommandClient.sslCA}`)
      }

      if (BaseCommandClient.sslCert) {
        command.options.push(`--ssl-ca=${BaseCommandClient.sslCert}`)
      }

      if (BaseCommandClient.sslKey) {
        command.options.push(`--ssl-ca=${BaseCommandClient.sslKey}`)
      }
    }

    command.options.push(`--result-file=${this._config.outputPath}${this.pathSep}${this.filename}`);

    if (this._config.insertIgnore) {
      command.options.push(`--insert-ignore`);
    }

    if (this._config.sqlInsert) {
      command.options.push(`--complete-insert`);
    }

    if (this._config.replaceInto) {
      command.options.push(`--replace`);
    }

    if (this._config.dropDatabase) {
      command.options.push(`--add-drop-database`);
    }

    if (this._config.createDatabase) {
      command.options.push(`--no-create-db`);
    }

    if (this._config.schemaOnly) {
      command.options.push(`--no-data`);
    }

    if (this._config.dataOnly) {
      command.options.push(`--no-create-db`);
      command.options.push(`--no-create-info`);
      command.options.push(`--no-tablespaces`);
    }

    if (this._config.customArgs && this._config.customArgs.trim() != '') {
      command.options.push(this._config.customArgs);
    }

    command.options.push(BaseCommandClient.databaseName);

    if (this._config.includeTables && this._config.includeTables.length > 0) {
      this._config.includeTables.forEach((table) => {
        command.options.push(table);
      });
    }

    return command;
  }
}
