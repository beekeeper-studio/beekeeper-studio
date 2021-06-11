// Copyright (c) 2015 The SQLECTRON Team

import fs from 'fs';
import {homedir} from 'os';
import path from 'path';
import mkdirp from 'mkdirp';
import { Error as CustomError } from '../lib/errors'


export function fileExists(filename: string) {
  return new Promise((resolve) => {
    fs.stat(filename, (err, stats) => {
      if (err) return resolve(false);
      resolve(stats.isFile());
    });
  });
}


export function fileExistsSync(filename: string) {
  try {
    return fs.statSync(filename).isFile();
  } catch (e) {
    return false;
  }
}


export function writeFile(filename: string, data: any) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}


export function writeJSONFile(filename: string, data: any) {
  return writeFile(filename, JSON.stringify(data, null, 2));
}


export function writeJSONFileSync(filename: string, data: any) {
  return fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}


export function readFile(filename: string): Promise<string> {
  const filePath = resolveHomePathToAbsolute(filename);
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(filePath), (err, data) => {
      if (err) return reject(err);
      resolve(data.toString());
    });
  });
}


export function readJSONFile(filename: string) {
  return readFile(filename).then((data) => JSON.parse(data));
}


export function readJSONFileSync(filename: string) {
  const filePath = resolveHomePathToAbsolute(filename);
  const data = fs.readFileSync(path.resolve(filePath), 'utf-8');
  return JSON.parse(data);
}

export function createParentDirectory(filename: string) {
  return mkdirp(path.dirname(filename))
}

export function createParentDirectorySync(filename: string) {
  mkdirp.sync(path.dirname(filename));
}


export function resolveHomePathToAbsolute(filename: string) {
  if (!/^~\//.test(filename)) {
    return filename;
  }

  return path.join(homedir(), filename.substring(2));
}



export function createCancelablePromise(error: CustomError, timeIdle = 100) {
  let canceled = false;
  let discarded = false;

  const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

  return {
    async wait() {
      while (!canceled && !discarded) {
        await wait(timeIdle);
      }

      if (canceled) {
        const err = new Error(error.message || 'Promise canceled.');

        Object.getOwnPropertyNames(error)
          // @ts-ignore
          .forEach((key: string) => err[key] = error[key]); // eslint-disable-line no-return-assign

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
