import { BaseCommandClient } from "@/lib/db/BaseCommandClient";
import { errorMessages } from "@commercial/backend/handlers/backupHandlers";
import { Command } from "@/lib/db/models";
import { BackupConfig } from "@/lib/db/models/BackupConfig";
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Dialect, identify } from 'sql-query-identifier'

type backupParams = {
  dialect: Dialect,
  backup: BaseCommandClient,
  restore: BaseCommandClient,
  backupConfig: Partial<BackupConfig>,
  restoreConfig: Partial<BackupConfig>,
  outputDirSuffix?: string,
  beforeRestore?: () => Promise<void>,
  verifyRestore?: () => Promise<void>,
  skipRestoreRun?: boolean,
}

export type BackupTestConfig = {
  description: string,
  backup: Partial<BackupConfig>,
  restore: Partial<BackupConfig>,
  outputDirSuffix?: string,
}

export function runBackupTests(getParams: () => backupParams) {
  let backupDir: string;
  let dialect: Dialect;
  let backup: BaseCommandClient;
  let restore: BaseCommandClient;
  let backupConfig: Partial<BackupConfig>;
  let restoreConfig: Partial<BackupConfig>;
  let outputDirSuffix: string | undefined;
  let beforeRestore: (() => Promise<void>) | undefined;
  let verifyRestore: (() => Promise<void>) | undefined;
  let skipRestoreRun: boolean;

  beforeAll(() => {
    // TODO (@day): look into this further
    // I hate this with a burning passion, but just doesn't like me just passing to the function...
    const params = getParams();
    dialect = params.dialect;
    backup = params.backup;
    restore = params.restore;
    backupConfig = params.backupConfig;
    restoreConfig = params.restoreConfig;
    outputDirSuffix = params.outputDirSuffix;
    beforeRestore = params.beforeRestore;
    verifyRestore = params.verifyRestore;
    skipRestoreRun = params.skipRestoreRun ?? false;
  })

  it("Should be able to find the backup dump tool", async () => {
    await expect(backup.findDumpTool()).resolves.not.toThrow();
  })

  it("Should create a backup command", () => {
    backupDir = fs.mkdtempSync(path.join(os.tmpdir(), `${dialect}-backup-`));
    if (outputDirSuffix) {
      backupDir = path.join(backupDir, outputDirSuffix);
      fs.mkdirSync(backupDir, { recursive: true });
    }
    if (backupConfig.format === 'd') {
      backupDir = fs.mkdtempSync(path.join(backupDir, `${dialect}-dir-backup-`));
    }
    backupConfig.outputPath = backupDir;
    backup.config = backupConfig;
    backup.initLogFile();
    backup.addLogCallback = (log: string) => {
      backup.writeToLog(log);
    }
    backup.notificationCallback = (_notif) => {
      return;
    }

    let command: Command = backup.buildCommand();
    expect(command).not.toBeNull();

    const commands: string[] = [`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`];

    while (command.postCommand) {
      command = command.postCommand;

      commands.push(`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`);
    }
  })

  it("Should be able to run a backup", async () => {
    try {
      await backup.runCommand();
    } catch (e) {
      // this may reject even if the command actually succeeds (don't blame me, blame pg_dump)
      // so we need to check if it succeeds in other ways
      expect(e).toBe(errorMessages.nonZero)
    }

    if (backupConfig.format !== 'd') {
      const backupPath = path.join(backupDir, backup.filename);
      expect(fs.existsSync(backupPath)).toBe(true);
      if (!['t', 'c'].includes(backupConfig.format) && !backupConfig.compression) {
        // read 3 kb of the file just to see if it actually contains sql
        const data = await readFile(backupPath);

        const identification = identify(data, { strict: false, dialect });
        expect(identification.some((value) => value.executionType !== 'UNKNOWN')).toBe(true);
      }
    } else {
      expect(fs.existsSync(backupDir)).toBe(true)
    }
  })

  it("Should be able to find the restore tool", async () => {
    await expect(restore.findDumpTool()).resolves.not.toThrow();
  })

  it("Should create a restore command", () => {
    const inputPath = restoreConfig.isDir ? backupDir : path.join(backupDir, backup.filename);
    restoreConfig.inputPath = inputPath;
    restore.config = restoreConfig;

    restore.initLogFile();
    restore.addLogCallback = (log: string) => {
      restore.writeToLog(log);
    }
    restore.notificationCallback = (_notif) => {
      return;
    }

    let command: Command = restore.buildCommand();
    expect(command).not.toBeNull();

    // TODO (@day): any way to validate the command?
    const commands: string[] = [`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`];

    while (command.postCommand) {
      command = command.postCommand;

      commands.push(`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`);
    }
  })

  it("Should be able to run a restore", async () => {
    if (skipRestoreRun) {
      return;
    }

    if (beforeRestore) {
      await beforeRestore();
    }

    try {
      await restore.runCommand();
    } catch (e) {
      // this may reject even if the command actually succeeds (don't blame me, blame pg_restore)
      // so we need to check if it succeeds in other ways
      expect(e).toBe(errorMessages.nonZero)
    }

    if (verifyRestore) {
      await verifyRestore();
    }
  })
}

async function readFile(path: string): Promise<string> {
  const s = fs.createReadStream(path, { end: 3000 });
  let data = '';

  s.on('data', (chunk) => {
    data += chunk;
  })

  const close = new Promise<void>((resolve) => {
    s.on('close', () => { resolve() })
  });

  await close;
  return data;
}
