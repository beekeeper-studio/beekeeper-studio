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
import { UserSetting } from "@/common/appdb/models/user_setting";
import { TokenCache } from "@/common/appdb/models/token_cache";

const log = rawLog.scope('Appdb handlers');

function defaultTransform<T extends Transport>(obj: T, cls?: any) {
  const newObj = {} as unknown as T;
  return cls.merge(newObj, obj);
}

function handlersFor<T extends Transport>(name: string, cls: any, transform: (obj: T, cls?: any) => T = defaultTransform) {

  return {
    // this is so we can get defaults on objects
    [`appdb/${name}/new`]: async function({ init }: { init?: any }) {
      return transform(new cls(init), cls);
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
          return (await cls.save(newEnts, options)).map((e) => transform(e, cls));
      } else {
        let dbObj: any = obj.id ? await cls.findOne(obj.id) : new cls(obj);
        if (dbObj && obj.id) {
          cls.merge(dbObj, obj);
        } else if (!dbObj) {
          dbObj = new cls(obj);
        }
        log.info(`Saving ${name}: `, dbObj);
        await dbObj.save();
        return transform(dbObj, cls);
      }
    },
    [`appdb/${name}/remove`]: async function({ obj }: { obj: T | T[] }) {
      if (_.isArray(obj)) {
        const ids = obj.map((e) => e.id);
        const dbEntities = await cls.findByIds(ids);
        await cls.remove(dbEntities)
      } else {
        const dbObj = await cls.findOne(obj.id);
        log.info(`Removing ${name}: `, dbObj);
        await dbObj?.remove();
      }
    },
    [`appdb/${name}/find`]: async function({ options }: { options: FindManyOptions<any> }) {
      return (await cls.find(options)).map((value) => {
        return transform(value, cls);
      })
    },
    [`appdb/${name}/findOne`]: async function({ options }: { options: FindOneOptions<any> | string | number }) {
      return transform(await cls.findOne(options), cls)
    }
  }
}

function transformSetting(obj: UserSetting): TransportUserSetting {
  return {
    ...obj,
    value: obj.value
  };
}

function transformSavedConn(obj: SavedConnection): IConnection {
  return {
    ...obj,
    connectionType: obj._connectionType,
    sshMode: obj._sshMode,
    port: obj._port,
    socketPath: obj._socketPath
  }
}

export const AppDbHandlers = {
  ...handlersFor<IConnection>('saved', SavedConnection, transformSavedConn),
  ...handlersFor<IConnection>('used', UsedConnection),
  ...handlersFor<TransportPinnedConn>('pinconn', PinnedConnection),
  ...handlersFor<TransportPinnedEntity>('pins', PinnedEntity),
  ...handlersFor<TransportFavoriteQuery>('query', FavoriteQuery),
  ...handlersFor<TransportUsedQuery>('usedQuery', UsedQuery),
  ...handlersFor<TransportOpenTab>('tabs', OpenTab),
  ...handlersFor<TransportHiddenEntity>('hiddenEntity', HiddenEntity),
  ...handlersFor<TransportHiddenSchema>('hiddenSchema', HiddenSchema),
  ...handlersFor<TransportUserSetting>('setting', UserSetting, transformSetting),
  'appdb/saved/parseUrl': async function({ url, conn }: { url: string, conn?: SavedConnection }) {
    if (!conn) {
      conn = new SavedConnection()
    } else {
      conn = await SavedConnection.findOne(conn.id) ?? new SavedConnection();
    }
    if (!conn.parse(url)) {
      throw `Unable to parse ${url}`;
    }
    return transformSavedConn(conn);
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
    return transformSetting(await UserSetting.findOne({key}));
  },
  'appdb/cache/remove': async function({ authId }: { authId: number }) {
    const cache = await TokenCache.findOne(authId);
    await cache.remove();
  },
  'appdb/cache/new': async function() {
    let cache = new TokenCache();
    cache = await cache.save();
    return cache.id;
  },
};
