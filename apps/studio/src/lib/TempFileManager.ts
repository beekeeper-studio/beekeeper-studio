import Vue from 'vue';
import { TransportTempFile } from '@/common/transport';

export class TempFileManager {
  ready = false;

  file: TransportTempFile = null;

  get path() {
    if (!this.ready) {
      throw new Error('File Manager not ready');
    }
    return this.file.name;
  }

  async init(): Promise<TempFileManager> {
    this.file = await Vue.prototype.$util.send('temp/create');
    await Vue.prototype.$util.send('temp/open', { id: this.file.id });
    this.ready = true;
    return this;
  }

  async reset(): Promise<void> {
    this.ready = false;

    await this.deleteFile();

    await this.init();
  }

  async deleteFile(): Promise<void> {
    if (!this.file) return;
    await Vue.prototype.$util.send('temp/delete', { id: this.file.id });
    this.file = null;
    this.ready = false;
  }

  async write(content: string): Promise<void> {
    if (!this.ready) {
      throw new Error('File Manager not ready');
    }

    await Vue.prototype.$util.send('temp/write', { id: this.file.id, content });
  }

}
