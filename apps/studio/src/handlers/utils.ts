import path from 'path';
import { homedir } from 'os';

export function resolveHomePathToAbsolute(filename: string): string {
  if (!/^~\//.test(filename)) {
    return filename;
  }

  return path.join(homedir(), filename.substring(2));
}
