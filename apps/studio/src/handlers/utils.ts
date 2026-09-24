import path from 'path';
import { homedir } from 'os';

export function resolveHomePathToAbsolute(filename: string): string {
  if (!/^~\//.test(filename)) {
    return filename;
  }

  return path.join(homedir(), filename.substring(2));
}

// null, undefined, 0 and -1 all mean "no connection"
export function isValidConnectionId(connectionId: unknown): connectionId is number {
  return typeof connectionId === 'number' && connectionId > 0;
}
