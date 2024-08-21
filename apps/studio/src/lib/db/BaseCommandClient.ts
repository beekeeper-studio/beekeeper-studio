import { BackupConfig } from "./models/BackupConfig";
import { IConnection } from "@/common/interfaces/IConnection";
import { BasicDatabaseClient } from "./clients/BasicDatabaseClient";
import { IDbConnectionServerConfig } from "./types";
import { SupportedBackupFeatures, Command, CommandSettingSection, CommandControlAction, CommandSettingControl } from "./models";
import { ChildProcess, spawn } from "child_process";
import platformInfo from "@/common/platform_info";
import { TempFileManager } from "../TempFileManager";

export interface Notification {
  text: string,
  type: any
}

export const errorMessages = {
  nonZero: 'Command returned non-zero exit code'
}

type DatabaseClient = BasicDatabaseClient<any>

export abstract class BaseCommandClient {
  // temp file (for full logs)
  private tempFile: TempFileManager = null;
  // the command instance (for cancelling)
  private proc: ChildProcess = null;
  protected readonly defaultFileType: string = '';

  protected pathSep: string = !platformInfo.isWindows ? '/' : '\\';
  protected mode: 'backup' | 'restore' = 'backup';
  // Backup Config
  protected _config: BackupConfig;
  // This is for when we support SQL commands
  protected static _conn: DatabaseClient;

  // For ssh
  protected static _localHost: string;
  protected static _localPort: number;
  set serverConfig(value: IDbConnectionServerConfig) {
    BaseCommandClient._localHost = value.localHost;
    BaseCommandClient._localPort = value.localPort;
  }

  set connection(value: DatabaseClient) {
    BaseCommandClient._conn = value;
  }

  // Connection Details
  protected static databaseName: string;
  protected static username?: string;
  protected static host: string;
  protected static port?: number;
  protected static socket?: string;
  protected static socketPathEnabled?: boolean;
  protected static ssl?: boolean;
  protected static sslCA?: string;
  protected static sslCert?: string;
  protected static sslKey?: string;

  protected static _password?: string;
  static get quotedPassword() {
    return `"${BaseCommandClient._password.replace(/"/g, platformInfo.isWindows ? `""` : `\\"`)}"`;
  }

  set connConfig(value: IConnection) {
    BaseCommandClient.databaseName = BaseCommandClient.databaseName ?? value.defaultDatabase;
    BaseCommandClient.username = value.username;
    BaseCommandClient._password = value.password;
    BaseCommandClient.host = value.host;
    BaseCommandClient.port = value.port;
    BaseCommandClient.socket = value.socketPath;
    BaseCommandClient.socketPathEnabled = value.socketPathEnabled;
    BaseCommandClient.ssl = value.ssl;
    BaseCommandClient.sslCA = value.sslCaFile;
    BaseCommandClient.sslCert = value.sslCertFile;
    BaseCommandClient.sslKey = value.sslKeyFile;
  }

  set database(value: string) {
    BaseCommandClient.databaseName = value;
  }

  get config(): Partial<BackupConfig> | undefined {
    return this._config;
  }

  set config(value: Partial<BackupConfig>) {
    if (!value) {
      // Clear everything but the connection details and the dumpToolPath
      const toolPath = this._config.dumpToolPath;
      this._config = new BackupConfig({ outputPath: platformInfo.downloadsDirectory });
      this._config.dumpToolPath = toolPath;
      this._config.toolName = this.toolName;
    } else {
      Object.assign(this._config, value);
    }
  }

  get settingsConfig() {
    const settings = {};
    this.settingsSections.forEach((section) => {
      section.controls.forEach((control) => {
        settings[control.settingName] = this._config[control.settingName];
      })
    });
    return settings;
  }

  protected get binaryLocation(): CommandSettingSection {
    return {
      header: 'Binary Location',
      controls: [
        {
          controlType: 'info',
          settingDesc: `🧚 Hey! Looks like we can't find a ${this.toolName} install. `,
          // infoLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          // infoLinkText: 'Learn more',
          show: (config: BackupConfig): boolean => {
            return !config.dumpToolPath || !this.allowedTools.some((value) => config.dumpToolPath.includes(value));
          }
        },
        {
          controlType: 'select',
          settingName: 'toolName',
          settingDesc: 'Select a tool to use',
          required: true,
          selectOptions: [
            ...this.allowedTools.map(value => {
              return {
                name: value, value
              }
            })
          ],
          show: (_config: BackupConfig): boolean => {
            return this.allowedTools.length > 1;
          },
          onValueChange: (config: BackupConfig): void => {
            if (this.allowedTools.includes(config?.toolName)) {
              this.toolName = config.toolName;
            }
          }
        },
        {
          controlType: 'filepicker',
          settingName: 'dumpToolPath',
          settingDesc: `Path to ${this.toolName}`,
          required: true,
          controlOptions: {
            buttonLabel: `Choose ${this.toolName} binary`,
          },
          placeholder: 'Choose',
          valid: (config: BackupConfig): boolean => {
            return this.allowedTools.some(value => config.dumpToolPath.endsWith(value)) || 
              this.allowedTools.some(value => config.dumpToolPath.endsWith(`${value}.exe`));
          },
          actions: [
            {
              disabled: false,
              value: 'Find',
              icon: 'search',
              onClick: async (config: BackupConfig): Promise<void> => {
                await this.findDumpTool(config, true);
              },
              tooltip: `Automatically find ${this.toolName}`
            }
          ]
        }
      ]
    };
  }

  protected get fileSettings(): CommandSettingSection {
    const isRestore = this.mode === 'restore';
    return {
      header: isRestore ? 'Choose Your Backup' : 'Output',
      show: (config: BackupConfig): boolean => {
        return !this.toolName || (config.dumpToolPath && config.dumpToolPath.includes(this.toolName));
      },
      controls: [
        isRestore && BaseCommandClient._conn.supportedFeatures().backDirFormat ? {
          controlType: 'checkbox',
          settingName: 'isDir',
          settingDesc: 'Restore a "directory" backup',
        } : null,
        {
          controlType: 'filepicker',
          settingName: isRestore ? 'inputPath' : 'outputPath',
          settingDesc: isRestore ? 'Backup Location' : 'Output Directory',
          required: true,
          controlOptions: {
            buttonLabel: isRestore ? 'Select Backup' : 'Choose Directory',
            properties: [ 'openDirectory', 'createDirectory' ]
          },
          placeholder: 'Choose',
          show: (config: BackupConfig): boolean => {
            return !isRestore || config.isDir;
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
            return isRestore && !config.isDir;
          }
        },
        !isRestore ? {
          controlType: 'input',
          settingName: 'filename',
          settingDesc: 'Filename',
          required: true,
          show: (config: BackupConfig): boolean => {
            return config.format != 'd';
          },
          actions: isRestore ? [] : [
            this.fileTypeAction
          ]
        } : null,
      ].filter((s) => !!s) as any[]
    }
  }

  protected get remoteOrDockerControls(): CommandSettingControl[] {
    const isRestore = this.mode === 'restore';
    return [
      {
        controlType: 'checkbox',
        settingName: 'isRemote',
        settingDesc: 'Is your database on a remote server?',
        show: (config: BackupConfig) => {
          return !config.isDocker;
        }
      },
      {
        controlType: 'checkbox',
        settingName: 'isDocker',
        settingDesc: 'Is your database in a local docker container?',
        required: false,
        show: (config: BackupConfig) => {
          return !config.isRemote;
        }
      },
      {
        controlType: 'checkbox',
        settingName: 'copyToHost',
        settingDesc: isRestore ? 'Is the backup on your host machine?' : 'Would you like the backup copied to your host machine?',
        show: (config: BackupConfig) => {
          return !config.isRemote && config.isDocker;
        },
        required: false
      },
      {
        controlType: 'filepicker',
        settingName: 'dockerCliPath',
        settingDesc: 'Path to the container cli (must support the docker cp command syntax)',
        show: (config: BackupConfig) => {
          return !config.isRemote && config.isDocker && config.copyToHost;
        },
        required: true
      },
      {
        controlType: 'input',
        settingName: 'dockerContainerName',
        settingDesc: 'Name of the docker container that your database is in.',
        show: (config: BackupConfig) => {
          return !config.isRemote && config.isDocker && config.copyToHost;
        },
        required: true
      }
    ];
  }

  protected get fileTypeAction(): CommandControlAction {
    return {
      disabled: true,
      value: ((config: BackupConfig): string => {
        return this.determineFileType(config);
      })
    }
  }

  protected get customSettings(): CommandSettingSection {
    return {
      header: this.toolName ? `${this.toolName} Custom Arguments` : 'Custom Arguments',
      show: (config: BackupConfig): boolean => {
        return !this.toolName || (config.dumpToolPath && config.dumpToolPath.includes(this.toolName));
      },
      controls: [
        {
          controlType: 'textarea',
          settingName: 'customArgs',
          settingDesc: `Add any other command line flags you need.`,
          required: false
        }
      ]
    }
  }

  protected _addLogCallback: (log: string) => void;

  protected _notificationCallback: (notif: Notification) => void;

  protected toolName?: string;
  protected allowedTools?: Array<string>;

  public get filename() {
    const fileExt = this.determineFileType();
    if (this._config.filename.endsWith(fileExt)) return this._config.filename;

    return `${this._config.filename}${fileExt}`;
  }

  // Log file things
  public async initLogFile() {
    this.tempFile = await new TempFileManager().init();
  }

  public async resetLogFile() {
    this.tempFile?.reset();
  }

  public async writeToLog(content: string) {
    await this.tempFile.write(content);
  }

  public deleteLogFile() {
    this.tempFile.deleteFile();
  }

  public get logPath() {
    return this.tempFile.path;
  }

  // end log file things

  protected get mainCommand() {
    return platformInfo.isWindows ? `"${this._config.dumpToolPath}"` : this._config.dumpToolPath;
  }


  public async findDumpTool(config: BackupConfig = this._config, notify = false) {
    try {
      const value = await this.whichDumpTool();
      if (value) {
        config.dumpToolPath = value;

        if (notify) {
          this._notificationCallback({
            text: `Found ${this.toolName} at ${value}`,
            type: 'success'
          });
        }
      }
    } catch (e) {
      if (notify) {
        this._notificationCallback({
          text: `Could not find ${this.toolName}`,
          type: 'error'
        });
      }
      console.error(e?.message ?? e);
    }
  }

  public set addLogCallback(value: (log: string) => void) {
    this._addLogCallback = value;
  }

  public set notificationCallback(value: (notif: Notification) => void) {
    this._notificationCallback = value;
  }

  constructor(toolName?: string) {
    this._config = new BackupConfig({ outputPath: platformInfo.downloadsDirectory });
    this.toolName = toolName;
    this.allowedTools = [this.toolName];
    // this._config.toolName = this.toolName;
  }

  public abstract supportedFeatures(): SupportedBackupFeatures;
  public abstract get settingsSections(): CommandSettingSection[];
  public abstract buildCommand(): Command;

  protected abstract processLog(chunk: any): string[];
  public async runCommand(): Promise<void> {
    const command = this.buildCommand();
    return this._runCommand(command);
  }

  public cancelCommand(): boolean {
    if (this.proc) {
      return this.proc.kill();
    }
    // proc has already finished
    return true;
  }

  protected determineFileType(config: BackupConfig = this._config): string {
    switch(config.format) {
      case 'p':
        return '.sql';
      case 't':
        return '.tar';
      case 'c':
        return '.dump';
      default:
        return this.defaultFileType;
    }
  }

  // TODO (day): apparently the where command can return multiple values, so we are going to
  // have to account for that and choose the 'right' output (probable just the first one that
  // includes the tool name)
  private async whichDumpTool(): Promise<string> {
    if (!this.toolName) {
      return null;
    }

    const command = `${platformInfo.isWindows ? 'where' : 'which'}`

    return new Promise<string>((resolve, reject) => {
      const proc = spawn(command, [this.toolName], { shell: true });

      proc.stdout.on('data', (chunk) => {
        if (chunk) {
          const path: string = chunk.toString().trim();
          resolve(path);
        }
      });

      proc.stderr.on('data', (chunk) => {
        reject(chunk.toString());
      })

      proc.on('error', (err) => {
        reject(err);
      })

      proc.on('close', (code) => {
        if (code != 0) {
          reject('ERROR: Command exited with errors');
        }
      })
    })
  }

  private async _runCommand(command: Command): Promise<void> {
    if (command.isSql) {
      // Execute SQL command on connection
      return new Promise<void>((resolve, reject) => {
        BaseCommandClient._conn.query(`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`).execute()
          .catch((reason) => {
            this._notificationCallback({
              text: reason.message ?? reason ?? 'Something went wrong',
              type: 'error'
            });
            reject();
          })
          .then(async (_value) => {
            // check that the previous command succeeded?
            if (!command.postCommand) {
              resolve();
            } else {
              await this._runCommand(command.postCommand);
              resolve();
            }
          });
      })
    } else {
      this.proc = spawn(command.mainCommand, command.options, {
        shell: true,
        env: command.env
      });

      this.proc.stdout.on('data', (chunk) => {
        this.processLog(chunk).forEach((log) => {
          if (log && this._addLogCallback) {
            this._addLogCallback(log);
          }
        })
      });

      this.proc.stderr.on('data', (chunk) => {
        // pg_dump outputs to the stderr buffer for some reason.
        this.processLog(chunk).forEach((log) => {
          if (log && this._addLogCallback) {
            this._addLogCallback(log);
          }
        })
      })

      return new Promise<void>((resolve, reject) => {
        this.proc.on('error', (err) => {
          this._notificationCallback({
            text: err.message,
            type: 'error'
          });

          reject(`Command run error: ${err.message}`);
        })

        this.proc.on('close', async (code) => {
          // non-zero means something went wrong
          if (code != 0) {
            this._notificationCallback({
              text: 'Something went wrong! Check the command logs for details',
              type: 'error'
            });

            reject(errorMessages.nonZero);
          } else if (!command.postCommand) {
            resolve();
          } else {
            await this._runCommand(command.postCommand);
            resolve();
          }
          this.proc = null;
        })
      })

    }
  }
}
