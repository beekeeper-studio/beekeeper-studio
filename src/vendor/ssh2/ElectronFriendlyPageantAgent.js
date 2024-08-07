import platformInfo from "@/common/platform_info";

// This file is copyright Brian White [MIT License], except where modified.
/* eslint-disable */
const { spawn } = require("child_process");
const path = require("path");
const { OpenSSHAgent } = require("ssh2");
const { Duplex } = require("stream");
/* eslint-enable */

function readUInt32BE(buf, offset) {
  return (buf[offset++] * 16777216)
    + (buf[offset++] * 65536)
    + (buf[offset++] * 256)
    + buf[offset];
}

export function resolvePagentExePath() {
  // in production we bundle this in to the app bundle properly.
  if (platformInfo.env.development) {
    return path.resolve('.', 'vendor/pagent.exe')
  }
  const RAWPATH = path.resolve(platformInfo.resourcesPath, 'vendor/pagent.exe');
  const EXEPATH = RAWPATH.includes('app.asar') ? RAWPATH.replace('app.asar', 'app.asar.unpacked') : RAWPATH;
  return EXEPATH
}


const ElectronFriendlyPageantAgent = (() => {
  const RET_ERR_BADARGS = 10;
  const RET_ERR_UNAVAILABLE = 11;
  const RET_ERR_NOMAP = 12;
  const RET_ERR_BINSTDIN = 13;
  const RET_ERR_BINSTDOUT = 14;
  const RET_ERR_BADLEN = 15;


  const EXEPATH = resolvePagentExePath()

  const ERROR = {
    [RET_ERR_BADARGS]: new Error('Invalid pagent.exe arguments'),
    [RET_ERR_UNAVAILABLE]: new Error('Pageant is not running'),
    [RET_ERR_NOMAP]: new Error('pagent.exe could not create an mmap'),
    [RET_ERR_BINSTDIN]: new Error('pagent.exe could not set mode for stdin'),
    [RET_ERR_BINSTDOUT]: new Error('pagent.exe could not set mode for stdout'),
    [RET_ERR_BADLEN]:
      new Error('pagent.exe did not get expected input payload'),
  };

  function destroy(stream) {
    stream.buffer = null;
    if (stream.proc) {
      stream.proc.kill();
      stream.proc = undefined;
    }
  }

  class PageantSocket extends Duplex {
    constructor() {
      super();
      this.proc = undefined;
      this.buffer = null;
    }
    _read(n) {
      // empty on purpose
    }
    _write(data, encoding, cb) {
      if (this.buffer === null) {
        this.buffer = data;
      } else {
        const newBuffer = Buffer.allocUnsafe(this.buffer.length + data.length);
        this.buffer.copy(newBuffer, 0);
        data.copy(newBuffer, this.buffer.length);
        this.buffer = newBuffer;
      }
      // Wait for at least all length bytes
      if (this.buffer.length < 4)
        return cb();

      const len = readUInt32BE(this.buffer, 0);
      // Make sure we have a full message before querying pageant
      if ((this.buffer.length - 4) < len)
        return cb();

      data = this.buffer.slice(0, 4 + len);
      if (this.buffer.length > (4 + len))
        return cb(new Error('Unexpected multiple agent requests'));
      this.buffer = null;

      let error;
      const proc = this.proc = spawn(EXEPATH, [data.length]);
      proc.stdout.on('data', (data) => {
        this.push(data);
      });
      proc.on('error', (err) => {
        error = err;
        cb(error);
      });
      proc.on('close', (code) => {
        this.proc = undefined;
        if (!error) {
          // eslint-disable-next-line no-cond-assign
          if (error = ERROR[code])
            return cb(error);
          cb();
        }
      });
      proc.stdin.end(data);
    }
    _final(cb) {
      destroy(this);
      cb();
    }
    _destroy(err, cb) {
      destroy(this);
      cb();
    }
  }

  return class PageantAgent extends OpenSSHAgent {
    getStream(cb) {
      cb(null, new PageantSocket());
    }
  };
})();

export default ElectronFriendlyPageantAgent
