import { BackupConfig } from "../models/BackupConfig";
import { BaseCommandClient } from "../BaseCommandClient";
import { Command, CommandSettingSection, SupportedBackupFeatures } from "../models";

export class PostgresRestoreClient extends BaseCommandClient {
  constructor() {
    super('pg_restore');
    this.mode = 'restore';
  }

  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: false,
      settings: true
    };
  }

  get settingsSections(): CommandSettingSection[] {
    return [
      this.fileSettings,
      this.binaryLocation,
      {
        header: 'General',
        show: (config: BackupConfig): boolean => {
          return config.dumpToolPath && config.dumpToolPath.includes(this.toolName);
        },
        controls: [
          {
            controlType: 'info',
            settingDesc: '🧚 Hey! If you selected the plain text backup format, you should be able to run that file directly in Beekeeper to restore your backup!'
          },
          {
            controlType: 'checkbox',
            settingName: 'noBackupPrivileges',
            settingDesc: 'Prevent restoration of access privileges (GRANT/REVOKE)',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'discardOwners',
            settingDesc: 'Do not output commands to set ownership of objects to match the original database',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'dropDatabase',
            settingDesc: 'Clean (drop) database objects before recreating them.',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'createDatabase',
            settingDesc: 'Create the database before restoring into it.',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'dataOnly',
            settingDesc: 'Restore only the data, not the schema (data definitions)',
            required: false,
            show: (config: BackupConfig): boolean => {
              return !config.schemaOnly;
            }
          },
          {
            controlType: 'checkbox',
            settingName: 'schemaOnly',
            settingDesc: 'Restore only the object definitions (schema), not data.',
            required: false,
            show: (config: BackupConfig): boolean => {
              return !config.dataOnly;
            }
          },
        ]
      },
      this.customSettings
    ]
  }

  processLog(chunk: any): string[] {
    if (!chunk)
      return null;

    const str = chunk.toString();

    if (!str)
      return null;

    const expr = new RegExp(this.toolName, 'g');
    const match = str.match(expr);
    if (!match || match.length <= 1)
      return [str];

    const output = [];
    str.split(expr).forEach((log: string) => {
      if (log.trim() === '')
        return;
      output.push(`${this.toolName}${log}`);
    });
    return output;
  }

  buildCommand(): Command {
    const command = new Command({
      isSql: false,
      env: {
        PGPASSWORD: BaseCommandClient._password,
        PGSSLMODE: BaseCommandClient.ssl ? 'require' : 'prefer',
        PGSSLROOTCERT: BaseCommandClient.sslCA ? BaseCommandClient.sslCA : null,
        PGSSLCERT: BaseCommandClient.sslCert ? BaseCommandClient.sslCert : null,
        PGSSLKEY: BaseCommandClient.sslKey ? BaseCommandClient.sslKey : null,
      },
      mainCommand: this.mainCommand,
      options: [
        `--verbose`,
        `--username=${BaseCommandClient.username}`,
      ]
    });

    if (BaseCommandClient.socketPathEnabled) {
      command.options.push(...[
        `--host=${BaseCommandClient.socket}`
      ]);
    } else {
      command.options.push(...[
        `--host=${BaseCommandClient._localHost ?? BaseCommandClient.host}`,
        `--port=${BaseCommandClient._localPort ?? BaseCommandClient.port}`,
      ]);
    }

    if (this._config.dataOnly) {
      command.options.push('--data-only');
    }

    if (this._config.schemaOnly) {
      command.options.push('--schema-only')
    }

    if (this._config.noBackupPrivileges) {
      command.options.push('--no-privileges');
    }

    if (this._config.dropDatabase) {
      command.options.push('--clean');
    }

    if (this._config.createDatabase) {
      command.options.push('--create');
    }

    if (this._config.discardOwners) {
      command.options.push('--no-owner');
    }

    if (this._config.includeSchemata && this._config.includeSchemata.length > 0) {
      this._config.includeSchemata.forEach((x) => {
        command.options.push(`--schema=${x}`);
      });
    }

    if (this._config.includeTables && this._config.includeTables.length > 0) {
      this._config.includeTables.forEach((x) => {
        command.options.push(`--table=${x}`);
      });
    }

    if (this._config.excludeTables && this._config.excludeTables.length > 0) {
      this._config.excludeTables.forEach((x) => {
        command.options.push(`--exclude-table=${x}`);
      });
    }

    if (this._config.customArgs && this._config.customArgs != '') {
      command.options.push(this._config.customArgs);
    }

    command.options.push(`--dbname=${BaseCommandClient.databaseName}`)

    command.options.push(`${this._config.inputPath}`);

    return command;
  }
}
