import { Transport } from '@/common/transport/transport';
import Vue from 'vue';
// import rawLog from 'electron-log';

// const log = rawLog.scope('UtilityAppDbEntities');

export abstract class BaseUtilityAppDbEntity implements Transport {
  constructor(private type: string) {
    
  }

  async save(): Promise<void> {
    await Vue.prototype.$util.send(`appdb/${this.type}/save`, { obj: this });
  }

  async remove(): Promise<void> {
    await Vue.prototype.$util.send(`appdb/${this.type}/remove`, { obj: this });
  }

  static async find(_options?: any): Promise<any[]> {
    throw new Error('find not implemented. Must be overriden in base class.')
  }

  static async findOne(_options?: any): Promise<any> {
    throw new Error('findOne not implemented. Must be overriden in base class.')
  }

  static async save<T extends Transport>(_entities: T[], _options?: any): Promise<T[]> {
    throw new Error('Save multiple not implemented. Must be overriden in base class');
  }

  protected fromTransport<T extends Transport>(item: T) {
    return Object.assign(this, item);
  }

  id: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
