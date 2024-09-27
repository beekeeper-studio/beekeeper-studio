import { PathLike, WriteFileOptions } from "fs";
import { promises as fs } from 'fs'
import path from 'path';

export interface IFileHandlers {
  "file/read": ({ path, options }: { path: PathLike; options?: { encoding?: string; flag?: string }; }) => Promise<string | Buffer>;
  "file/write": ({ path, text, options }: { path: PathLike; text: string; options?: WriteFileOptions; }) => Promise<void>;
  "file/exists": ({ path }: { path: PathLike; }) => Promise<boolean>;
  "file/pathJoin": ({ paths }: { paths: string[]; }) => Promise<string>;
}

export const FileHandlers: IFileHandlers = {
  "file/read": async function ({ path, options }: { path: PathLike; options?: { encoding?: string; flag?: string }; }): Promise<string | Buffer> {
    return await fs.readFile(path, options);
  },

  "file/write": async function ({ path, text, options }: { path: PathLike; text: string; options?: WriteFileOptions; }): Promise<void> {
    await fs.writeFile(path, text, options);
  },

  "file/exists": async function ({ path }: { path: PathLike; }): Promise<boolean> {
    try {
      return (await fs.stat(path)).isFile();
    } catch (e) {
      return false;
    }
  },

  "file/pathJoin": async function ({ paths }: { paths: string[]; }): Promise<string> {
    return path.join(...paths);
  }

};
