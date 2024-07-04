import { PinnedConnection } from "@/common/appdb/models/PinnedConnection";
import { SavedConnection } from "@/common/appdb/models/saved_connection"
import { UsedConnection } from "@/common/appdb/models/used_connection" 
import { IConnection } from "@/common/interfaces/IConnection" 
import { Transport, TransportFavoriteQuery, TransportPinnedConn } from "@/common/transport/transport";
import { FindManyOptions, FindOneOptions, SaveOptions } from "typeorm";
import rawLog from 'electron-log';
import _ from 'lodash';
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";

const log = rawLog.scope('Appdb handlers');

function handlersFor<T extends Transport>(name: string, cls: any) {
  return {
    // this is so we can get defaults on objects
    [`appdb/${name}/new`]: async function() {
      return new cls();
    },
    [`appdb/${name}/save`]: async function({ obj, options }: { obj: T | T[], options: SaveOptions }) {
      if (_.isArray(obj)) {
          const ids = obj.map((e) => e.id);
          const dbEntities = await cls.findByIds(ids);
          const newEnts = obj.map((e) => {
            const dbEnt = dbEntities.find((v) => v.id === e.id);

            if (dbEnt) {
              return cls.merge(dbEnt, e);
            }
        
            return new cls(e);
          });
          return await cls.save(newEnts, options);
      } else {
        let dbObj: any = obj.id ? await cls.findOne(obj.id) : new cls(obj);
        if (dbObj && obj.id) {
          cls.merge(dbObj, obj);
        } else if (!dbObj) {
          dbObj = new cls(obj);
        }
        log.info(`Saving ${name}: `, dbObj);
        await dbObj.save();
        return dbObj;
      }
    },
    [`appdb/${name}/remove`]: async function({ obj }: { obj: T }) {
      const dbObj = await cls.findOne(obj.id);
      log.info(`Removing ${name}: `, dbObj);
      await dbObj?.remove();
    },
    [`appdb/${name}/find`]: async function({ options }: { options: FindManyOptions<any> }) {
      return (await cls.find(options)).map((value) => {
        const obj = {} as unknown as T;
        return cls.merge(obj, value);
      })
    },
    [`appdb/${name}/findOne`]: async function({ options }: { options: FindOneOptions<any> | string | number }) {
      return await cls.findOne(options)
    }
  }
}

// should we even have this?
export interface IAppDbHandlers {
  'appdb/saved/new': () => Promise<any>,
  'appdb/saved/save': ({ obj, options }: { obj: IConnection | IConnection[], options?: SaveOptions }) => Promise<any>,
  'appdb/saved/remove': ({ obj }: { obj: IConnection }) => Promise<void>,
  'appdb/saved/find': ({ options }: { options: FindManyOptions<SavedConnection> }) => Promise<IConnection[]>
  'appdb/saved/findOne': ({ options }: { options: FindOneOptions<SavedConnection> | string | number }) => Promise<IConnection>
  'appdb/saved/parseUrl': ({ url }: { url: string }) => Promise<IConnection>, 


  'appdb/used/new': () => Promise<any>,
  'appdb/used/save': ({ obj, options }: { obj: IConnection | IConnection[], options?: SaveOptions }) => Promise<any>,
  'appdb/used/remove': ({ obj }: { obj: IConnection }) => Promise<void>,
  'appdb/used/find': ({ options }: { options: FindManyOptions<UsedConnection> }) => Promise<IConnection[]>
  'appdb/used/findOne': ({ options }: { options: FindOneOptions<UsedConnection> | string | number }) => Promise<IConnection>


  'appdb/pinconn/new': () => Promise<any>,
  'appdb/pinconn/save': ({ obj }: { obj: TransportPinnedConn | TransportPinnedConn[], options?: SaveOptions }) => Promise<any>,
  'appdb/pinconn/remove': ({ obj }: { obj: TransportPinnedConn }) => Promise<void>,
  'appdb/pinconn/find': ({ options }: { options: FindManyOptions<PinnedConnection> }) => Promise<TransportPinnedConn[]>
  'appdb/pinconn/findOne': ({ options }: { options: FindOneOptions<PinnedConnection> | string | number }) => Promise<TransportPinnedConn>
}

export const AppDbHandlers: IAppDbHandlers = {
  ...handlersFor<IConnection>('saved', SavedConnection),
  ...handlersFor<IConnection>('used', UsedConnection),
  ...handlersFor<TransportPinnedConn>('pinconn', PinnedConnection),
  ...handlersFor<TransportFavoriteQuery>('query', FavoriteQuery),
  'appdb/saved/parseUrl': async function({ url }: { url: string }) {
    const conn = new SavedConnection();
    if (!conn.parse(url)) {
      throw `Unable to parse ${url}`;
    }
    return conn;
  },
} as unknown as IAppDbHandlers;
