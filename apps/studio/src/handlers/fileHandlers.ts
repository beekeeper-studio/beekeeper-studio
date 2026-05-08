import { PathLike, WriteFileOptions } from "fs";
import { promises as fs } from 'fs'
import path from 'path';
import os from 'os';

export interface IFileHandlers {
  "file/read": ({ path, options }: { path: PathLike; options?: { encoding?: string; flag?: string }; }) => Promise<string | Buffer>;
  "file/write": ({ path, text, options }: { path: PathLike; text: string; options?: WriteFileOptions; }) => Promise<void>;
  "file/exists": ({ path }: { path: PathLike; }) => Promise<boolean>;
  "file/pathJoin": ({ paths }: { paths: string[]; }) => Promise<string>;
}

function allowedRoots(): string[] {
  const roots: string[] = [];
  try {
    const home = os.homedir();
    if (home) roots.push(home);
  } catch { /* ignore */ }
  return roots
    .filter(Boolean)
    .map((r) => path.resolve(r));
}

function isPathContained(targetPath: PathLike): boolean {
  if (typeof targetPath !== 'string') return false;
  const resolved = path.resolve(targetPath);
  const roots = allowedRoots();
  return roots.some((root) => {
    if (!root) return false;
    if (resolved === root) return true;
    return resolved.startsWith(root + path.sep);
  });
}

function assertSafePath(targetPath: PathLike): void {
  if (!isPathContained(targetPath)) {
    throw new Error(`Refusing to access path outside allowed roots: ${String(targetPath)}`);
  }
}

export const FileHandlers: IFileHandlers = {
  "file/read": async function ({ path, options }: { path: PathLike; options?: { encoding?: string; flag?: string }; }): Promise<string | Buffer> {
    assertSafePath(path);
    return await fs.readFile(path, options);
  },

  "file/write": async function ({ path, text, options }: { path: PathLike; text: string; options?: WriteFileOptions; }): Promise<void> {
    assertSafePath(path);
    await fs.writeFile(path, text, options);
  },

  "file/exists": async function ({ path }: { path: PathLike; }): Promise<boolean> {
    if (!isPathContained(path)) return false;
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
