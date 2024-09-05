import { BackupConfig } from "../models/BackupConfig";
import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command, CommandSettingSection, SelectControlOption } from "../models";

export class SqlServerBackupClient extends BaseCommandClient {
  defaultFileType = '.bak';

  private encryptionAlgorithms: SelectControlOption[] = [
    { name: 'AES 128', value: 'AES_128' },
    { name: 'AES 192', value: 'AES_192' },
    { name: 'AES 256', value: 'AES_256' },
    { name: 'Triple DES 3-Key', value: 'TRIPLE_DES_3KEY' }
  ];

  private encryptorTypes: SelectControlOption[] = [
    { name: 'Server Certificate', value: 'cert' },
    { name: 'Server Asymmetric Key', value: 'key' }
  ];

  // overriding this as we need to add some conditionals for the docker stuff
  get fileSettings(): CommandSettingSection {
    return {
      header: 'Output',
      controls: [
        ...this.remoteOrDockerControls,
        {
          controlType: 'info',
          settingDesc: `As your database is remote or in a docker container, you will have to manually enter the output path. You may also leave it empty to backup to the default SQL Server backup location.`,
          show: (config: BackupConfig): boolean => {
            return config.isRemote || (config.isDocker && !config.copyToHost);
          }
        },
        {
          controlType: 'filepicker',
          settingName: 'outputPath',
          settingDesc: 'Output Directory',
          required: true,
          controlOptions: {
            buttonLabel: 'Choose Directory',
            properties: [ 'openDirectory', 'createDirectory' ]
          },
          placeholder: 'Choose',
          show: (config: BackupConfig): boolean => {
            return (!config.isRemote && !config.isDocker) || config.copyToHost;
          }
        },
        {
          controlType: 'input',
          settingName: 'outputPath',
          settingDesc: 'Output Directory',
          required: false,
          show: (config: BackupConfig): boolean => {
            return config.isRemote || (config.isDocker && !config.copyToHost);
          }
        },
        {
          controlType: 'input',
          settingName: 'filename',
          settingDesc: 'Filename',
          required: true,
          actions: [
            this.fileTypeAction
          ]
        }
      ]
    }
  }

  get settingsSections(): CommandSettingSection[] {
    return [
      {
        header: 'SQL Server Backup Options',
        controls: [
          {
            controlType: 'info',
            settingDesc: 'For information regarding these options, please visit the',
            infoLink: 'https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver16',
            infoLinkText: 'backup statement documentation.'
          },
          {
            controlType: 'checkbox',
            settingName: 'encryption',
            settingDesc: 'Encrypt backup?',
            required: false
          },
          {
            controlType: 'select',
            settingName: 'encryptionAlgorithm',
            settingDesc: 'Encryption Algorithm',
            selectOptions: this.encryptionAlgorithms,
            placeholder: 'Select an encryption algorithm...',
            required: true,
            show: (config: BackupConfig): boolean => {
              return config.encryption;
            }
          },
          {
            controlType: 'select',
            settingName: 'encryptorType',
            settingDesc: 'Encryptor Type',
            selectOptions: this.encryptorTypes,
            placeholder: 'Select an encryptor type...',
            required: true,
            show: (config: BackupConfig): boolean => {
              return config.encryption;
            }
          },
          {
            controlType: 'input',
            settingName: 'encryptionCertificate',
            settingDesc: 'Server Encryption Certificate',
            required: true,
            show: (config: BackupConfig): boolean => {
              return config.encryption && config.encryptorType == 'cert'
            }
          },
          {
            controlType: 'input',
            settingName: 'encryptionKey',
            settingDesc: 'Server Asymmetric Key',
            required: true,
            show: (config: BackupConfig): boolean => {
              return config.encryption && config.encryptorType == 'key'
            }
          }
        ]
      },
      this.fileSettings,
      this.customSettings
    ];
  }
  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: false,
      settings: true,
    };
  }
  processLog(chunk: any): string[] {
    return [chunk.toString()]
  }
  buildCommand(): Command {
    const command = new Command({
      isSql: true,
      env: {},
      mainCommand: `BACKUP DATABASE ${BaseCommandClient.databaseName}`,
      options: [
        `TO DISK = '${this._config.outputPath && this._config.outputPath.trim() != '' ? this._config.outputPath + this.pathSep : ''}${this.filename}'`, // backup device
      ]
    });

    if (this._config.encryption) {
      const certCommand = this._config.encryptorType == 'key' ? 'SERVER ASYMMETRIC KEY' : 'SERVER CERTIFICATE';
      command.options.push(`WITH ENCRYPTION (ALGORITHM = ${this._config.encryptionAlgorithm}, ${certCommand} = ${this._config.encryptionCertificate}),`);
    } else {
      command.options.push('WITH')
    }

    if (this._config.customArgs && this._config.customArgs.trim() != '') {
      command.options.push(this._config.customArgs);
    }

    const lastOption = command.options.pop().trim();
    if (lastOption !== 'WITH') {
      command.options.push(lastOption.replace(/,+$/, ''));
    }

    if (this._config.copyToHost && !this._config.isRemote) {
      const postCommand = new Command({
        isSql: false,
        env: {},
        mainCommand: this._config.dockerCliPath,
        options: [
          `cp`,
          `${this._config.dockerContainerName}:/var/opt/mssql/data/${this._config.filename}`,
          `${this._config.outputPath}${this.pathSep}${this._config.filename}`
        ]
      });
      command.postCommand = postCommand;
    }

    return command;
  }
}
