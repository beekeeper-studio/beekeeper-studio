import { PinnedConnection } from "@/common/appdb/models/PinnedConnection";
import { SavedConnection } from "@/common/appdb/models/saved_connection"
import { UsedConnection } from "@/common/appdb/models/used_connection"
import { IConnection } from "@/common/interfaces/IConnection"
import { Transport, TransportCloudCredential, TransportFavoriteQuery, TransportLicenseKey, TransportPinnedConn, TransportUsedQuery } from "@/common/transport";
import { FindManyOptions, FindOneOptions, FindOptionsWhere, In, SaveOptions } from "typeorm";
import _ from 'lodash';
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { UsedQuery } from "@/common/appdb/models/used_query";
import { PinnedEntity } from "@/common/appdb/models/PinnedEntity";
import { OpenTab } from "@/common/appdb/models/OpenTab";
import { HiddenEntity } from "@/common/appdb/models/HiddenEntity";
import { HiddenSchema } from "@/common/appdb/models/HiddenSchema";
import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import { TransportHiddenEntity, TransportHiddenSchema } from "@/common/transport/TransportHidden";
import { TransportPinnedEntity } from "@/common/transport/TransportPinnedEntity";
import { TransportUserSetting } from "@/common/transport/TransportUserSetting";
import { UserSetting } from "@/common/appdb/models/user_setting";
import { TokenCache } from "@/common/appdb/models/token_cache";
import { CloudCredential } from "@/common/appdb/models/CloudCredential";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import rawLog from "@bksLogger"
import { validate } from "class-validator";

const log = rawLog.scope('Appdb handlers');

function defaultTransform<T extends Transport>(obj: T, cls: any) {
  if (_.isNil(obj)) {
    return null
  }
  const newObj = {} as unknown as T;
  return cls.merge(newObj, obj);
}

async function niceValidateOrReject(ent: any): Promise<void> {
  const errors = await validate(ent);
  if (errors && errors.length > 0) {
    const err = errors.map((err) => err.toString(false, false, "", true)).join("\n");
    throw new Error(err);
  }
}

function handlersFor<T extends Transport>(name: string, cls: any, transform: (obj: T, cls: any) => T = defaultTransform) {

  return {
    // this is so we can get defaults on objects
    [`appdb/${name}/new`]: async function({ init }: { init?: any }) {
      return transform(new cls().withProps(init), cls);
    },
    [`appdb/${name}/save`]: async function({ obj, options }: { obj: T | T[], options: SaveOptions }) {
      if (_.isArray(obj)) {
          const ids = obj.map((e) => e.id);
          const dbEntities = await cls.findBy({
            id: In(ids)
          });
          const newEnts = await Promise.all(obj.map(async (e) => {
            const dbEnt = dbEntities.find((v) => v.id === e.id);

            if (dbEnt) {
              await niceValidateOrReject(dbEnt)
              return cls.merge(dbEnt, e);
            }

            const newEnt = new cls().withProps(e);
            await niceValidateOrReject(newEnt);
            return newEnt;
          }));
          return (await cls.save(newEnts, options)).map((e) => transform(e, cls));
      } else {
        let dbObj: any = obj.id ? await cls.findOneBy({ id: obj.id }) : new cls().withProps(obj);
        if (dbObj && obj.id) {
          cls.merge(dbObj, obj);
        } else if (!dbObj) {
          dbObj = new cls().withProps(obj);
        }
        log.info(`Saving ${name}: `, dbObj);
        await niceValidateOrReject(dbObj);
        await dbObj.save();
        return transform(dbObj, cls);
      }
    },
    [`appdb/${name}/remove`]: async function({ obj }: { obj: T | T[] }) {
      if (_.isArray(obj)) {
        const ids = obj.map((e) => e.id);
        const dbEntities = await cls.findBy({
          id: In(ids)
        });
        await cls.remove(dbEntities)
      } else {
        const dbObj = await cls.findOneBy({ id: obj.id });
        log.info(`Removing ${name}: `, dbObj);
        await dbObj?.remove();
      }
    },
    [`appdb/${name}/find`]: async function({ options }: { options?: FindManyOptions<any> }) {
      return (await cls.find(options)).map((value) => {
        return transform(value, cls);
      })
    },
    [`appdb/${name}/findOneBy`]: async function({ options }: { options: FindOptionsWhere<any> | string | number }) {
      return transform(await cls.findOneBy(options), cls)
    },
    [`appdb/${name}/findOne`]: async function({ options }: { options: FindOneOptions<any> | string | number }) {
      return transform(await cls.findOne(options), cls)
    },
    [`appdb/${name}/count`]: async function(args: FindManyOptions<any> | { options?: FindManyOptions<any> }) {
      // Support both direct options or wrapped in { options: ... }
      const options = 'options' in args ? args.options : args;
      return await cls.count(options);
    }
  }
}

function transformSetting(obj: UserSetting, _cls: any): TransportUserSetting {
  if (_.isNil(obj)) {
    return null
  }

  return {
    ...obj,
    value: obj?.value
  };
}

function transformLicense(obj: LicenseKey, _cls: any): TransportLicenseKey {
  if (_.isNil(obj)) return null
  return {
    ...obj,
    active: obj?.active ?? false
  };
}

export const AppDbHandlers = {
  ...handlersFor<IConnection>('saved', SavedConnection),
  ...handlersFor<IConnection>('used', UsedConnection),
  ...handlersFor<TransportPinnedConn>('pinconn', PinnedConnection),
  ...handlersFor<TransportPinnedEntity>('pins', PinnedEntity),
  ...handlersFor<TransportFavoriteQuery>('query', FavoriteQuery),
  ...handlersFor<TransportUsedQuery>('usedQuery', UsedQuery),
  ...handlersFor<TransportOpenTab>('tabs', OpenTab),
  ...handlersFor<TransportHiddenEntity>('hiddenEntity', HiddenEntity),
  ...handlersFor<TransportHiddenSchema>('hiddenSchema', HiddenSchema),
  ...handlersFor<TransportUserSetting>('setting', UserSetting, transformSetting),
  ...handlersFor<TransportCloudCredential>('credential', CloudCredential),
  ...handlersFor<TransportLicenseKey>('license', LicenseKey, transformLicense),
  'appdb/saved/parseUrl': async function({ url }: { url: string }) {
    const conn = new SavedConnection();
    if (!conn.parse(url)) {
      throw `Unable to parse ${url}`;
    }
    return defaultTransform(conn, SavedConnection);
  },
  'appdb/setting/set': async function({ key, value }: { key: string, value: string }) {
    let existing = await UserSetting.findOneBy({ key });
    if (!existing) {
      existing = new UserSetting();
      existing.key = key;
      existing.defaultValue = value;
    }
    existing.userValue = value;
    await existing.save();
  },
  'appdb/setting/get': async function({ key }: { key: string }) {
    return transformSetting(await UserSetting.findOneBy({key}), UserSetting);
  },
  'appdb/cache/remove': async function({ authId }: { authId: number }) {
    const cache = await TokenCache.findOneBy({ id: authId });
    await cache.remove();
  },
  'appdb/cache/new': async function() {
    let cache = new TokenCache();
    cache = await cache.save();
    return cache.id;
  },
};
