import { promises as fs } from 'fs'
import path from 'path';
import platformInfo from '@/common/platform_info';

const VIMRC_FILENAME = '.beekeeper.vimrc';
const MAX_SQL_FILE_BYTES = 50 * 1024 * 1024; // 50 MB — sanity cap on a single saved query.

export interface IFileHandlers {
  /**
   * Read the user's vim config file from a fixed location inside the
   * beekeeper user directory. The renderer cannot pass a path. Returns the
   * file contents as utf-8, or null if the file does not exist.
   */
  "config/readVimrc": () => Promise<string | null>;
  /**
   * Read a `.sql` file the user picked through a native open dialog. The
   * path is validated to (a) end in `.sql` and (b) point at a regular file
   * the user already has access to. Content is returned as utf-8.
   */
  "file/readSqlFile": ({ path }: { path: string }) => Promise<string>;
}

export const FileHandlers: IFileHandlers = {
  "config/readVimrc": async function (): Promise<string | null> {
    const vimrcPath = path.join(platformInfo.userDirectory, VIMRC_FILENAME);
    try {
      return await fs.readFile(vimrcPath, { encoding: 'utf-8' });
    } catch (e: any) {
      if (e?.code === 'ENOENT') return null;
      throw e;
    }
  },

  "file/readSqlFile": async function ({ path: targetPath }: { path: string }): Promise<string> {
    if (typeof targetPath !== 'string' || targetPath.length === 0) {
      throw new Error('readSqlFile requires a path');
    }
    const ext = path.extname(targetPath).toLowerCase();
    if (ext !== '.sql') {
      throw new Error(`readSqlFile only accepts .sql files, got "${ext || '(none)'}"`);
    }
    const stat = await fs.stat(targetPath);
    if (!stat.isFile()) {
      throw new Error(`readSqlFile target is not a regular file: ${targetPath}`);
    }
    if (stat.size > MAX_SQL_FILE_BYTES) {
      throw new Error(
        `readSqlFile target exceeds ${MAX_SQL_FILE_BYTES} bytes: ${targetPath}`
      );
    }
    return await fs.readFile(targetPath, { encoding: 'utf-8' });
  },
};
