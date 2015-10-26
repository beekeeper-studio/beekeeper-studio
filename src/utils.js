import { join } from 'path';


export function getConfigPath() {
  return join(homedir(), '.sqlectron.json');
}


export function homedir() {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}
