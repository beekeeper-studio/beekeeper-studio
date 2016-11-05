import fs from 'fs';
import path from 'path';
import pf from 'portfinder';


export function getConfigPath() {
  return path.join(homedir(), '.sqlectron.json');
}


export function homedir() {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}


export function fileExists(filename) {
  return new Promise((resolve) => {
    fs.stat(filename, (err, stats) => {
      if (err) return resolve(false);
      resolve(stats.isFile());
    });
  });
}


export function writeFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}


export function writeJSONFile(filename, data) {
  return writeFile(filename, JSON.stringify(data, null, 2));
}


export function readFile(filename) {
  const filePath = resolveHomePathToAbsolute(filename);
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(filePath), (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}


export function readJSONFile(filename) {
  return readFile(filename).then((data) => JSON.parse(data));
}


function resolveHomePathToAbsolute(filename) {
  if (!/^~\//.test(filename)) {
    return filename;
  }

  return path.join(homedir(), filename.substring(2));
}


export function getPort() {
  return new Promise((resolve, reject) => {
    pf.getPort({ host: '127.0.0.1' }, (err, port) => {
      if (err) return reject(err);
      resolve(port);
    });
  });
}

export function createCancelablePromise(error, timeIdle = 100) {
  let canceled = false;
  let discarded = false;

  const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));

  return {
    async wait() {
      while (!canceled && !discarded) {
        await wait(timeIdle);
      }

      if (canceled) {
        const err = new Error(error.message || 'Promise canceled.');

        Object.getOwnPropertyNames(error)
          .forEach((key) => err[key] = error[key]); // eslint-disable-line no-return-assign

        throw err;
      }
    },
    cancel() {
      canceled = true;
    },
    discard() {
      discarded = true;
    },
  };
}
