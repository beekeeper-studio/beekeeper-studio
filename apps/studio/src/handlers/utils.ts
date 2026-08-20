import path from 'path';
import { homedir } from 'os';

export function resolveHomePathToAbsolute(filename: string): string {
  if (!/^~\//.test(filename)) {
    return filename;
  }

  return path.join(homedir(), filename.substring(2));
}

// Tabs, pins, hidden entities and query history are all keyed on a
// saved_connection id. null, undefined, 0 and -1 all mean "no connection" -
// a session on a connection that was never saved, or a caller that lost track
// of the id. Nothing may be written or deleted under one of those: -1 is a
// shared bucket every unsaved session would pile into, and an absent id can
// widen a connection-scoped delete into an unscoped one.
export function isConnectionScope(connectionId: unknown): connectionId is number {
  return typeof connectionId === 'number' && connectionId > 0;
}
