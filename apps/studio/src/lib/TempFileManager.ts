import tmp from 'tmp';
import fs from 'fs'

export class TempFileManager {
  ready = false;

  fileObject: tmp.FileSyncObject = null;
  fileHandle: fs.promises.FileHandle = null;

  constructor() {
    this.fileObject = tmp.fileSync({ postfix: '.txt'});
  }

  get path() {
    if (!this.ready) {
      throw new Error('File Manager not ready');
    }
    return this.fileObject.name;
  }

  async init(): Promise<TempFileManager> {
    if (!this.fileObject) {
      throw new Error('Failed to create temp file');
    }

    this.fileHandle = await fs.promises.open(this.fileObject.name, 'w+');
    this.ready = true;
    return this;
  }

  async reset(): Promise<void> {
    this.ready = false;

    this.deleteFile();
    this.fileObject = tmp.fileSync();

    await this.init();
  }

  deleteFile(): void {
    this.fileObject.removeCallback();
  }

  async write(content: string): Promise<void> {
    if (!this.ready) {
      throw new Error('File Manager not ready');
    }

    await this.fileHandle.write(content);
  }

}