import { BackupConfig } from "../models/BackupConfig";
import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command, CommandSettingSection } from "../models";

export class SqlServerRestoreClient extends BaseCommandClient {
  get fileSettings(): CommandSettingSection {
    return {
      header: 'Choose Your Backup',
      controls: [
        ...this.remoteOrDockerControls,
        {
          controlType: 'info',
          settingDesc: `As your database is remote or in a docker container, you will have to manually enter the path to the backup. You may also just enter the name of the backup if it's in the default SQL Server backup location`,
          show: (config: BackupConfig): boolean => {
            return config.isRemote || (config.isDocker && !config.copyToHost);
          }
        },
        {
          controlType: 'filepicker',
          settingName: 'inputPath',
          settingDesc: 'Select Backup',
          required: true,
          controlOptions: {
            buttonLabel: 'Select Backup',
            properties: [ 'openFile', 'createDirectory' ]
          },
          placeholder: 'Choose',
          show: (config: BackupConfig): boolean => {
            return !config.isRemote && !(config.isDocker && !config.copyToHost);
          }
        },
        {
          controlType: 'input',
          settingName: 'inputPath',
          settingDesc: 'Backup Path',
          required: true,
          show: (config: BackupConfig): boolean => {
            return config.isRemote || (config.isDocker && !config.copyToHost);
          }
        }
      ]
    }
  }

  get settingsSections(): CommandSettingSection[] {
    return [
      this.fileSettings,
      this.customSettings
    ]
  }

  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: false,
      settings: true,
    };
  }

  processLog(chunk: any): string[] {
    return chunk.toString();
  }

  // NOTE (@day): This command doesn't work currently as you can't be connected to the database you are restoring
  // apparently. So we are going to have to figure out a way to safely switch databases before running this command,
  // and then we have to switch back. Easies way may be just to create a connection just for this process honestly
  buildCommand(): Command {
    const exp = /[\\/](?<file>[\w-]+\.?[\w-]+)$/g;
    const filename = exp.exec(this._config.inputPath).groups?.file;
    const command = new Command({
      isSql: true,
      env: {},
      mainCommand: `RESTORE DATABASE ${BaseCommandClient.databaseName}`,
      options: [
        `FROM DISK = '${this._config.copyToHost ? filename : this._config.inputPath}'`,
        `WITH REPLACE;`
      ]
    })

    if (this._config.copyToHost) {
      const preCommand = new Command({
        isSql: false,
        env: {},
        mainCommand: `docker`,
        options: [
          `cp`,
          `${this._config.inputPath}`,
          // do people run a sql server docker that is not linux?
          `${this._config.dockerContainerName}:/var/opt/mssql/data/${this._config.filename}`
        ],
        postCommand: command
      });

      return preCommand;
    }

    return command;
  }
}
