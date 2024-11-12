import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command, CommandSettingSection } from "../models";

export class MySqlRestoreClient extends BaseCommandClient {
  constructor(toolName: string) {
    super(toolName);
    this.mode = 'restore';
    this.allowedTools = ['mysql', 'mariadb']
  }
  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: false,
      settings: true,
    };
  }

  get settingsSections(): CommandSettingSection[] {
    return [
      this.fileSettings,
      this.binaryLocation,
      // This is for some future convenience options
      // {
      //   header: `Restore Options`,
      //   controls: [
      //     // NOTE: I (day) have made the executive decision not to support delimited text at release, so we are only going to do plain text :)
      //     // {
      //     //   controlType: 'select',
      //     //   settingName: 'format',
      //     //   settingDesc: 'Format',
      //     //   selectOptions: [
      //     //     { name: 'Plain', value: 'p' },
      //     //     { name: 'Delimited-Text', value: 'd' }
      //     //   ],
      //     //   placeholder: 'Select a format...',
      //     //   required: true
      //     // },
      //     {
      //       controlType: 'checkbox',
      //       settingName: 'createDatabase',
      //       settingDesc: 'Create a database before restoring',
      //       required: false,
      //     },
      //     {
      //       controlType: 'input',
      //       settingName: 'createDatabaseName',
      //       settingDesc: 'The name of the database to create',
      //       required: true,
      //       show: (config: BackupConfig): boolean => {
      //         return config.createDatabase;
      //       }
      //     }
      //   ]
      // },
    ]
  }

  processLog(chunk: any): string[] {
    return [chunk.toString()];
  }

  buildCommand(): Command {
    /* use the SQL command variant for sql-format and mysqlimport for the delimited-text format
      SQL format:
      `source dump.sql` 

      Delimited-text:
      **ACTUALLY** it may be easier to use mysqlimport as the SQL statement seems to only allow single table imports.
    */
    // return this._config.format == 'd' ? this.buildToolCommand() : this.buildSqlCommand();
    const command = new Command({
      isSql: false,
      env: {},
      mainCommand: this.mainCommand,
      options: [
        `--verbose`,
        `--user=${BaseCommandClient.username}`,
        `--password=${BaseCommandClient.quotedPassword}`,
      ]
    });

    if (BaseCommandClient.socketPathEnabled) {
      command.options.push(...[
        `--protocol=SOCKET`,
        `--socket=${BaseCommandClient.socket}`
      ])
    } else {
      command.options.push(...[
        `--protocol=TCP`,
        `--host=${BaseCommandClient._localHost ?? BaseCommandClient.host}`,
        `--port=${BaseCommandClient._localPort ?? BaseCommandClient.port}`,
        `--database=${BaseCommandClient.databaseName}`
      ]);
    }

    if (BaseCommandClient.ssl) {
      command.options.push(`--ssl`);

      if (BaseCommandClient.sslCA) {
        command.options.push(`--ssl-ca=${BaseCommandClient.sslCA}`);
      }

      if (BaseCommandClient.sslCert) {
        command.options.push(`--ssl-cert=${BaseCommandClient.sslCert}`);
      }

      if (BaseCommandClient.sslKey) {
        command.options.push(`--ssl-key=${BaseCommandClient.sslKey}`);
      }
    } else {
      command.options.push(BaseCommandClient.connectionType == 'mariadb' ? '--skip-ssl' : '--ssl-mode=DISABLED');
    }

    command.options.push(`--execute="SOURCE ${this._config.inputPath}"`);

    return command;
  }


  // NOTE (@day): this is for if we want to support the delimited-text format in the future. It will require more work though. 
  buildToolCommand(): Command {
    const command = new Command({
      isSql: false,
      env: {
      },
      mainCommand: this._config.dumpToolPath,
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
        '--ssl',
        '--ssl-mode=required'
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

    command.options.push(BaseCommandClient.databaseName);

    // get all files in the specified directory, reduce them to a distinct list.
    // const dirFiles: string[] = readdirSync(this._config.inputPath)
    //   .filter((value, index, array) => array.indexOf(value) === index);

    return command;
  }
}
