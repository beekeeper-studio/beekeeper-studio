import path from 'path';
import { homedir } from 'os';

export function resolveHomePathToAbsolute(filename: string): string {
  if (!/^~\//.test(filename)) {
    return filename;
  }

  return path.join(homedir(), filename.substring(2));
}

/*
  We only want to save pins/tabs/etc against a valid connectionId.
  That means: not null, > 0. 
  We use 0 or -1 as a "fake" id when we need it, hence the check here.

*/
export function isConnectionScope(connectionId: unknown): connectionId is number {
  return typeof connectionId === 'number' && connectionId > 0;
}
