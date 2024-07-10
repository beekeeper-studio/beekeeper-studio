import { PinnedConnection } from "@/common/appdb/models/PinnedConnection";
import { SavedConnection } from "@/common/appdb/models/saved_connection"
import { UsedConnection } from "@/common/appdb/models/used_connection" 
import { IConnection } from "@/common/interfaces/IConnection" 
import { Transport, TransportFavoriteQuery, TransportPinnedConn, TransportPinnedEntity, TransportUsedQuery } from "@/common/transport";
import { FindManyOptions, FindOneOptions, SaveOptions } from "typeorm";
import rawLog from 'electron-log';
import _ from 'lodash';
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { UsedQuery } from "@/common/appdb/models/used_query";
import { PinnedEntity } from "@/common/appdb/models/PinnedEntity";
import { OpenTab } from "@/common/appdb/models/OpenTab";
import { HiddenEntity } from "@/common/appdb/models/HiddenEntity";
import { HiddenSchema } from "@/common/appdb/models/HiddenSchema";
import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import { TransportHiddenEntity, TransportHiddenSchema } from "@/common/transport/TransportHidden";
import { TransportUserSetting } from "@/common/transport/TransportUserSetting";
import { IGroupedUserSettings, UserSetting } from "@/common/appdb/models/user_setting";

const log = rawLog.scope('Appdb handlers');

function handlersFor<T extends Transport>(name: string, cls: any) {
  return {
    // this is so we can get defaults on objects
    [`appdb/${name}/new`]: async function({ init }: { init?: any }) {
      return new cls(init);
    },
    [`appdb/${name}/save`]: async function({ obj, options }: { obj: T | T[], options: SaveOptions }) {
      console.log('RECEIVED: ', obj)
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
    [`appdb/${name}/remove`]: async function({ obj }: { obj: T | T[] }) {
      if (_.isArray(obj)) {
        const ids = obj.map((e) => e.id);
        const dbEntities = await cls.findByIds(ids);
        return await cls.remove(dbEntities)
      } else {
        const dbObj = await cls.findOne(obj.id);
        log.info(`Removing ${name}: `, dbObj);
        await dbObj?.remove();
      }
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
  'appdb/saved/new': ({ init }: { init?: any }) => Promise<any>,
  'appdb/saved/save': ({ obj, options }: { obj: IConnection | IConnection[], options?: SaveOptions }) => Promise<any>,
  'appdb/saved/remove': ({ obj }: { obj: IConnection | IConnection[] }) => Promise<void>,
  'appdb/saved/find': ({ options }: { options: FindManyOptions<SavedConnection> }) => Promise<IConnection[]>,
  'appdb/saved/findOne': ({ options }: { options: FindOneOptions<SavedConnection> | string | number }) => Promise<IConnection>,
  'appdb/saved/parseUrl': ({ url }: { url: string }) => Promise<IConnection>, 


  'appdb/used/new': ({ init }: { init?: any }) => Promise<any>,
  'appdb/used/save': ({ obj, options }: { obj: IConnection | IConnection[], options?: SaveOptions }) => Promise<any>,
  'appdb/used/remove': ({ obj }: { obj: IConnection | IConnection[] }) => Promise<void>,
  'appdb/used/find': ({ options }: { options: FindManyOptions<UsedConnection> }) => Promise<IConnection[]>,
  'appdb/used/findOne': ({ options }: { options: FindOneOptions<UsedConnection> | string | number }) => Promise<IConnection>,


  'appdb/pinconn/new': ({ init }: { init?: any }) => Promise<any>,
  'appdb/pinconn/save': ({ obj }: { obj: TransportPinnedConn | TransportPinnedConn[], options?: SaveOptions }) => Promise<any>,
  'appdb/pinconn/remove': ({ obj }: { obj: TransportPinnedConn | TransportPinnedConn[] }) => Promise<void>,
  'appdb/pinconn/find': ({ options }: { options: FindManyOptions<PinnedConnection> }) => Promise<TransportPinnedConn[]>,
  'appdb/pinconn/findOne': ({ options }: { options: FindOneOptions<PinnedConnection> | string | number }) => Promise<TransportPinnedConn>,

  
  'appdb/query/new': ({ init }: { init?: any }) => Promise<any>,
  'appdb/query/save': ({ obj }: { obj: TransportFavoriteQuery | TransportFavoriteQuery[], options?: SaveOptions }) => Promise<any>,
  'appdb/query/remove': ({ obj }: { obj: TransportFavoriteQuery | TransportFavoriteQuery[] }) => Promise<void>,
  'appdb/query/find': ({ options }: { options: FindManyOptions<FavoriteQuery> }) => Promise<TransportFavoriteQuery[]>,
  'appdb/query/findOne': ({ options }: { options: FindOneOptions<FavoriteQuery> | string | number }) => Promise<TransportFavoriteQuery>,

  
  'appdb/usedQuery/new': ({ init }: { init?: any }) => Promise<any>,
  'appdb/usedQuery/save': ({ obj }: { obj: TransportUsedQuery | TransportUsedQuery[], options?: SaveOptions }) => Promise<any>,
  'appdb/usedQuery/remove': ({ obj }: { obj: TransportUsedQuery | TransportUsedQuery[] }) => Promise<void>,
  'appdb/usedQuery/find': ({ options }: { options: FindManyOptions<UsedQuery> }) => Promise<TransportUsedQuery[]>,
  'appdb/usedQuery/findOne': ({ options }: { options: FindOneOptions<UsedQuery> | string | number }) => Promise<TransportUsedQuery>,
}

export const AppDbHandlers: IAppDbHandlers = {
  ...handlersFor<IConnection>('saved', SavedConnection),
  ...handlersFor<IConnection>('used', UsedConnection),
  ...handlersFor<TransportPinnedConn>('pinconn', PinnedConnection),
  ...handlersFor<TransportPinnedEntity>('pins', PinnedEntity),
  ...handlersFor<TransportFavoriteQuery>('query', FavoriteQuery),
  ...handlersFor<TransportUsedQuery>('usedQuery', UsedQuery),
  ...handlersFor<TransportOpenTab>('tabs', OpenTab),
  ...handlersFor<TransportHiddenEntity>('hiddenEntity', HiddenEntity),
  ...handlersFor<TransportHiddenSchema>('hiddenSchema', HiddenSchema),
  ...handlersFor<TransportUserSetting>('setting', UserSetting),
  'appdb/saved/parseUrl': async function({ url }: { url: string }) {
    const conn = new SavedConnection();
    if (!conn.parse(url)) {
      throw `Unable to parse ${url}`;
    }
    return conn;
  },
  'appdb/setting/set': async function({ key, value }: { key: string, value: string }) {
    let existing = await UserSetting.findOne({ key });
    if (!existing) {
      existing = new UserSetting();
      existing.key = key;
      existing.defaultValue = value;
    }
    existing.userValue = value;
    await existing.save();
  },
  'appdb/setting/get': async function({ key }: { key: string }) {
    return await UserSetting.findOne({key});
  },
  // I don't think this is needed but we'll see
  'appdb/setting/all': async function() {
    const settings = await UserSetting.find();
    return _(settings).groupBy('key').mapValues(vs => vs[0]).value() as IGroupedUserSettings
  },
} as unknown as IAppDbHandlers;
