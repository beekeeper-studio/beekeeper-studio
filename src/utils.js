import fs from 'fs';
import { join } from 'path';


export function getConfigPath() {
  return join(homedir(), '.sqlectron.json');
}


export function homedir() {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}


export function fileExists(filename) {
  return new Promise(resolve => {
    fs.stat(filename, (err, stats) => {
      if (err) return resolve(false);
      resolve(stats.isFile());
    });
  });
}


export function writeFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, JSON.stringify(data, null, 2), err => {
      if (err) return reject(err);
      resolve();
    });
  });
}


export function readFile(filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) return reject(err);
      resolve(JSON.parse(data));
    });
  });
}
