import { PathLike, readFileSync, statSync, WriteFileOptions, writeFileSync } from "fs";
import path from 'path';

export interface IFileHandlers {
  "file/read": ({ path, options }: { path: PathLike; options?: { encoding?: string; flag?: string }; }) => Promise<string | Buffer>;
  "file/write": ({ path, text, options }: { path: PathLike; text: string; options?: WriteFileOptions; }) => Promise<void>;
  "file/exists": ({ path }: { path: PathLike; }) => Promise<boolean>;
  "file/pathJoin": ({ paths }: { paths: string[]; }) => Promise<string>;
}

export const FileHandlers: IFileHandlers = {
  "file/read": async function ({ path, options }: { path: PathLike; options?: { encoding?: string; flag?: string }; }): Promise<string | Buffer> {
    return readFileSync(path, options);
  },

  "file/write": async function ({ path, text, options }: { path: PathLike; text: string; options?: WriteFileOptions; }): Promise<void> {
    writeFileSync(path, text, options);
  },

  "file/exists": async function ({ path }: { path: PathLike; }): Promise<boolean> {
    try {
      return statSync(path).isFile();
    } catch (e) {
      return false;
    }
  },

  "file/pathJoin": async function ({ paths }: { paths: string[]; }): Promise<string> {
    return path.join(...paths);
  }

};
