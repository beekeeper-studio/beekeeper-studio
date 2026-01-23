import { Command } from "@/lib/db/models";
import { spawn } from "child_process";
import { state } from "@/handlers/handlerState";
import platformInfo from "@/common/platform_info";

const errorMessages = {
  nonZero: 'Command returned non-zero exit code'
}

export interface IBackupHandlers {
  'backup/runCommand': ({ command, sId }: { command: Command, sId: string }) => Promise<void>,
  'backup/whichDumpTool': ({ toolName }: { toolName: string }) => Promise<string>,
  'backup/cancelCommand': ({ sId }: { sId: string }) => Promise<boolean>
}

export const BackupHandlers: IBackupHandlers = {
  'backup/runCommand': async function({ command, sId }: { command: Command, sId: string }) {
    if (command.isSql) {
      // Execute SQL command on connection
      return new Promise<void>(async (resolve, reject) => {
        (await state(sId).connection.query(`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`, null)).execute()
          .catch((reason) => {
            state(sId).port.postMessage({
              type: 'backupNotif',
              input: {
                text: reason.message ?? reason ?? 'Something went wrong',
                type: 'error'
              }
            });
            reject();
          })
          .then(async (_value) => {
            // check that the previous command succeeded?
            if (!command.postCommand) {
              resolve();
            } else {
              await this['backup/runCommand']({ command: command.postCommand, sId });
              resolve();
            }
          });
      })
    } else {
      state(sId).backupProc = spawn(command.mainCommand, command.options, {
        shell: true,
        env: command.env
      });

      state(sId).backupProc.stdout.on('data', (chunk) => {
        state(sId).port.postMessage({
          type: 'backupLog',
          input: chunk.toString()
        });
      });

      state(sId).backupProc.stderr.on('data', (chunk) => {
        // pg_dump outputs to the stderr buffer for some reason.
        state(sId).port.postMessage({
          type: 'backupLog',
          input: chunk.toString()
        });
      })

      return new Promise<void>((resolve, reject) => {
        state(sId).backupProc.on('error', (err) => {
          state(sId).port.postMessage({
            type: 'backupNotif',
            input: {
              text: err.message,
              type: 'error'
            }
          })

          reject(`Command run error: ${err.message}`);
        })

        state(sId).backupProc.on('close', async (code) => {
          // non-zero means something went wrong
          if (code != 0) {
            state(sId).port.postMessage({
              type: 'backupNotif',
              input: {
                text: 'Something went wrong! Check the command logs for details',
                type: 'error'
              }
            })

            reject(errorMessages.nonZero);
          } else if (!command.postCommand) {
            resolve();
          } else {
            await this['backup/runCommand']({ command: command.postCommand, sId });
            resolve();
          }
          state(sId).backupProc = null;
        })
      })
    }
  },
  'backup/whichDumpTool': async function({ toolName }: { toolName: string }) {
    const command = platformInfo.isWindows ? 'where' : 'which';

    return new Promise((resolve, reject) => {
      const proc = spawn(command, [toolName], { shell: true });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        reject(err);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          const path = stdout.trim().split('\n')[0]; // pick first result
          resolve(path);
        } else {
          reject(`whichTool failed (code ${code})\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`);
        }
      });
    });
  },
  'backup/cancelCommand': async function({ sId }: { sId: string }) {
    if (state(sId).backupProc) {
      return state(sId).backupProc.kill();
    }
    // proc has already finished
    return true;
  }
}
