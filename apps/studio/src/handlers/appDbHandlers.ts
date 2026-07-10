import { PinnedConnection } from "@/common/appdb/models/PinnedConnection";
import { SavedConnection } from "@/common/appdb/models/saved_connection"
import { UsedConnection } from "@/common/appdb/models/used_connection"
import { IConnection } from "@/common/interfaces/IConnection"
import { Transport, TransportCloudCredential, TransportFavoriteQuery, TransportLicenseKey, TransportPinnedConn, TransportUsedQuery, TransportFormatterPreset } from "@/common/transport";
import { BaseEntity, EntityManager, FindManyOptions, FindOneOptions, FindOptionsWhere, In, SaveOptions } from "typeorm";
import _ from 'lodash';
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { UsedQuery } from "@/common/appdb/models/used_query";
import { PinnedEntity } from "@/common/appdb/models/PinnedEntity";
import { OpenTab } from "@/common/appdb/models/OpenTab";
import { HiddenEntity } from "@/common/appdb/models/HiddenEntity";
import { FormatterPreset } from "@/common/appdb/models/FormatterPreset";
import { QueryFolder } from "@/common/appdb/models/QueryFolder";
import { ConnectionFolder } from "@/common/appdb/models/ConnectionFolder";
import { SshConfig } from "@/common/appdb/models/SshConfig";
import { ConnectionSshConfig } from "@/common/appdb/models/ConnectionSshConfig";
import { TransportSshConfig, TransportConnectionSshConfig } from "@/common/transport/TransportSshConfig";
import { IQueryFolder, IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { HiddenSchema } from "@/common/appdb/models/HiddenSchema";
import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import { TransportHiddenEntity, TransportHiddenSchema } from "@/common/transport/TransportHidden";
import { TransportPinnedEntity } from "@/common/transport/TransportPinnedEntity";
import { TransportTabulatorPersistence } from "@/common/transport/TransportTabulatorPersistence";
import { TabulatorPersistence } from "@/common/appdb/models/TabulatorPersistence";
import { TransportUserSetting } from "@/common/transport/TransportUserSetting";
import { UserSetting } from "@/common/appdb/models/user_setting";
import { TokenCache } from "@/common/appdb/models/token_cache";
import { CloudCredential } from "@/common/appdb/models/CloudCredential";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from'@/common/platform_info';
import rawLog from "@bksLogger"
import { validate } from "class-validator";

const log = rawLog.scope('Appdb handlers');

async function defaultTransform<T extends Transport>(obj: T, cls: any) {
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

function handlersFor<T extends Transport>(name: string, cls: typeof BaseEntity, transform: (obj: T, cls: any) => Promise<T> = defaultTransform) {

  return {
    // this is so we can get defaults on objects
    [`appdb/${name}/new`]: async function({ init }: { init?: any }) {
      return await transform(new cls().withProps(init), cls);
    },
    [`appdb/${name}/save`]: async function({ obj, options }: { obj: T | T[], options?: SaveOptions & {
      /** Pass this if you run custom queries and you want to include this method in your transaction. */
      manager?: EntityManager
    }}) {
      // Use query builder to select all columns (including those marked select: false by default)
      // since all columns are required for validation checks.
      // Bind to the transaction's manager when provided so reads and writes share it.
      const repo = options?.manager?.getRepository(cls) ?? cls.getRepository();
      const alias = "e";
      const allCols = repo.metadata.columns
      .map((c: { propertyPath: string }) => `${alias}.${c.propertyPath}`);
      if (_.isArray(obj)) {
          const ids = obj.map((e) => e.id);
          const dbEntities = await repo.createQueryBuilder(alias).select(allCols).where(`${alias}.id IN (:...ids)`, { ids }).getMany();
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
          return await Promise.all((await repo.save(newEnts, options)).map((e) => transform(e, cls)));
      } else {
        let dbObj = obj.id
          ? await repo
              .createQueryBuilder(alias)
              .select(allCols)
              .where(`${alias}.id = :id`, { id: obj.id })
              .getOne()
          : new cls().withProps(obj);
        if (dbObj && obj.id) {
          cls.merge(dbObj, obj);
        } else if (!dbObj) {
          dbObj = new cls().withProps(obj);
        }
        log.info(`Saving ${name}: `, dbObj);
        await niceValidateOrReject(dbObj);
        await repo.save(dbObj);
        return await transform(dbObj, cls);
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
      return await Promise.all((await cls.find(options)).map(async (value) => {
        return await transform(value, cls);
      }))
    },
    [`appdb/${name}/findOneBy`]: async function({ options }: { options: FindOptionsWhere<any> | string | number }) {
      return await transform(await cls.findOneBy(options), cls)
    },
    [`appdb/${name}/findOne`]: async function({ options }: { options: FindOneOptions<any> | string | number }) {
      return await transform(await cls.findOne(options), cls)
    },
    [`appdb/${name}/count`]: async function(args: FindManyOptions<any> | { options?: FindManyOptions<any> }) {
      // Support both direct options or wrapped in { options: ... }
      const options = 'options' in args ? args.options : args;
      return await cls.count(options);
    }
  }
}

async function transformSetting(obj: UserSetting, _cls: any): Promise<TransportUserSetting> {
  if (_.isNil(obj)) {
    return null
  }

  return {
    ...obj,
    value: obj?.value
  };
}

async function transformLicense(obj: LicenseKey, _cls: any): Promise<TransportLicenseKey> {
  if (_.isNil(obj)) return null
  return {
    ...obj,
    active: obj?.active ?? false
  };
}

async function transformConn(obj: SavedConnection, cls: any): Promise<IConnection> {
  if (_.isNil(obj)) return null;
  const status = await LicenseKey.getLicenseStatus();
  const canBeReadOnly = status.isUltimate || platformInfo.testMode;

  if (!canBeReadOnly) {
    obj.readOnlyMode = false;
  }

  const newObj = {} as unknown as SavedConnection;
  return cls.merge(newObj, obj);
}

export const AppDbHandlers = {
  ...handlersFor<IConnection>('saved', SavedConnection, transformConn),
  ...handlersFor<IConnection>('used', UsedConnection, transformConn),
  ...handlersFor<TransportPinnedConn>('pinconn', PinnedConnection),
  ...handlersFor<TransportPinnedEntity>('pins', PinnedEntity),
  ...handlersFor<TransportFavoriteQuery>('query', FavoriteQuery),
  ...handlersFor<TransportUsedQuery>('usedQuery', UsedQuery),
  ...handlersFor<TransportOpenTab>('tabs', OpenTab),
  ...handlersFor<TransportHiddenEntity>('hiddenEntity', HiddenEntity),
  ...handlersFor<TransportFormatterPreset>('formatterPreset', FormatterPreset),
  ...handlersFor<TransportHiddenSchema>('hiddenSchema', HiddenSchema),
  ...handlersFor<TransportUserSetting>('setting', UserSetting, transformSetting),
  ...handlersFor<TransportCloudCredential>('credential', CloudCredential),
  ...handlersFor<TransportLicenseKey>('license', LicenseKey, transformLicense),
  ...handlersFor<IQueryFolder>('queryFolder', QueryFolder),
  ...handlersFor<IConnectionFolder>('connectionFolder', ConnectionFolder),
  ...handlersFor<TransportSshConfig>('sshConfig', SshConfig),
  ...handlersFor<TransportConnectionSshConfig>('connectionSshConfig', ConnectionSshConfig),
  ...handlersFor<TransportTabulatorPersistence>('tabulatorPersistence', TabulatorPersistence),
  'appdb/saved/parseUrl': async function({ url }: { url: string }) {
    const conn = new SavedConnection();
    if (!conn.parse(url)) {
      throw `Unable to parse ${url}`;
    }
    return defaultTransform(conn, SavedConnection);
  },
  'appdb/saved/saveWithSshConfigs': async function(item: IConnection): Promise<IConnection> {
    return await SavedConnection.getRepository().manager.transaction(async (manager) => {
      const incoming = item.sshConfigs ?? [];
      const storeKeyfilePassword = item.sshStoreKeyfilePassword !== false;
      const keptSshConfigIds: number[] = [];

      // Strip sshConfigs so the connection's relation cascade does not run here;
      // the join rows are managed explicitly below.
      const saved = await AppDbHandlers['appdb/saved/save']({
        obj: _.omit(item, 'sshConfigs') as IConnection,
        options: { manager },
      }) as IConnection;

      for (let i = 0; i < incoming.length; i++) {
        const join = incoming[i];
        const fields = _.omit(
          join.sshConfig, ['createdAt', 'updatedAt', 'version']
        ) as Partial<TransportSshConfig>;

        // Strip out the keyfile password
        if (!storeKeyfilePassword) {
          fields.keyfilePassword = null;
        }

        // Insert when no id is supplied, otherwise update the existing row.
        const id = join.sshConfig?.id;
        const sshConfig = id
          ? await manager.findOneBy(SshConfig, { id })
          : new SshConfig();
        sshConfig.withProps(fields);
        await manager.save(sshConfig);
        keptSshConfigIds.push(sshConfig.id);

        const link = await manager.findOneBy(ConnectionSshConfig, {
          connectionId: saved.id,
          sshConfigId: sshConfig.id,
        }) || new ConnectionSshConfig();

        link.withProps({
          connectionId: saved.id,
          sshConfigId: sshConfig.id,
          position: join.position ?? i,
        });

        await manager.save(link);
      }

      // Drop links the payload omitted, plus their now-orphaned ssh_config rows.
      const existingLinks = await manager.findBy(ConnectionSshConfig, {
        connectionId: saved.id,
      });
      const staleLinks = existingLinks.filter(
        (link) => !keptSshConfigIds.includes(link.sshConfigId)
      );
      if (staleLinks.length > 0) {
        await manager.remove(staleLinks);
        const orphans = await manager.findBy(SshConfig, {
          id: In(staleLinks.map((l) => l.sshConfigId)),
        });
        if (orphans.length > 0) {
          await manager.remove(orphans);
        }
      }

      return await AppDbHandlers['appdb/saved/findOne']({
        options: { where: { id: saved.id } }
      });
    });
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
