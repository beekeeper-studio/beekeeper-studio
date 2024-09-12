import { BackupConfig } from "../models/BackupConfig";
import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command, BackupFormat, SelectControlOption, CommandSettingSection } from "../models";

export class PostgresBackupClient extends BaseCommandClient {
  defaultFileType = '.sql';

  constructor(toolName: string = null) {
    super(toolName ?? 'pg_dump');
  }

  private backupFormats: BackupFormat[] = [
    { name: 'Plain', value: 'p'},
    { name: 'Directory', value: 'd'},
    { name: 'Tar', value: 't'},
    { name: 'Custom', value: 'c'}
  ];

  private compressionLevels: SelectControlOption[] = [
    { name: '0', value: '0' },
    { name: '1', value: '1' },
    { name: '2', value: '2' },
    { name: '3', value: '3' },
    { name: '4', value: '4' },
    { name: '5', value: '5' },
    { name: '6', value: '6' },
    { name: '7', value: '7' },
    { name: '8', value: '8' },
    { name: '9', value: '9' }
  ];

  get settingsSections(): CommandSettingSection[] {
    // set defaults for postgres backup
    if (!this._config.format) {
      this._config.format = 'd';
    }

    return [
      this.fileSettings,
      this.binaryLocation,
      {
        header: 'pg_dump Options',
        show: (config: BackupConfig): boolean => {
          return config.dumpToolPath && config.dumpToolPath.includes(this.toolName);
        },
        controls: [
          {
            controlType: 'info',
            settingDesc: 'For information regarding these options, please visit the',
            infoLink: 'https://www.postgresql.org/docs/current/app-pgdump.html',
            infoLinkText: 'pg_dump documentation.'
          },
          {
            controlType: 'select',
            settingName: 'format',
            settingDesc: 'Format',
            selectOptions: this.backupFormats,
            placeholder: 'Select a format...',
            required: true
          },
          {
            controlType: 'select',
            settingName: 'compression',
            settingDesc: 'Compression',
            selectOptions: this.compressionLevels,
            placeholder: 'Optionally select a compression level...',
            required: false,
            show: (config: BackupConfig): boolean => {
              return config.format != 't'
            }
          },
          {
            controlType: 'checkbox',
            settingName: 'sqlInsert',
            settingDesc: 'Use SQL INSERT instead of COPY for rows',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'noBackupPrivileges',
            settingDesc: 'Do not backup privileges (GRANT/REVOKE)',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'discardOwners',
            settingDesc: 'Discard objects owner',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'dropDatabase',
            settingDesc: 'Add drop database statement',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'createDatabase',
            settingDesc: 'Add create database statement',
            required: false
          },
          {
            controlType: 'checkbox',
            settingName: 'dataOnly',
            settingDesc: 'Dump only the data, not the schema (data definitions)',
            required: false,
            show: (config: BackupConfig): boolean => {
              return !config.schemaOnly;
            }
          },
          {
            controlType: 'checkbox',
            settingName: 'schemaOnly',
            settingDesc: 'Dump only the object definitions (schema), not data.',
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

  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: true,
      settings: true,
    };
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
    // TODO (@day): just make this an inherited getter on the base class for all backup/restore clients
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
        `--format=${this._config.format}`,
        `--file=${this._config.outputPath}${this.pathSep}${this._config.format != 'd' ? this.filename : ''}`
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

    if (this._config.discardOwners) {
      command.options.push('--no-owner');
    }

    if (this._config.sqlInsert) {
      command.options.push('--inserts');
    }

    if (this._config.noBackupPrivileges) {
      command.options.push('--no-privileges');
    }

    if (this._config.dropDatabase) {
      command.options.push('--clean');
      command.options.push('--if-exists')
    }

    if (this._config.createDatabase) {
      command.options.push('--create');
    }

    if (this._config.compression) {
      command.options.push(`--compress=${this._config.compression}`);
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

    if (this._config.customArgs && this._config.customArgs.trim() != '') {
      command.options.push(this._config.customArgs);
    }

    command.options.push(BaseCommandClient.databaseName);

    return command;
  }
}
