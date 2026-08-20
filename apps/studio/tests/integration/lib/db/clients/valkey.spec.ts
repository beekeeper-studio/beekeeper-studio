import { dbtimeout } from "@tests/lib/db";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { createServer } from "@commercial/backend/lib/db/server";
import { RedisTestDriver, VALKEY } from "./redis/container";

/**
 * Valkey reuses the Redis driver wholesale, so redis.spec.ts is the exhaustive
 * command-level suite. This covers the pieces that are specific to Valkey:
 * routing through the `valkey` connection type, version reporting, and enough
 * of the driver surface to prove the Redis client works against a real Valkey
 * server.
 */
describe('Valkey', () => {
  jest.setTimeout(dbtimeout);

  let connection: BasicDatabaseClient<any>;
  let config;

  beforeAll(async () => {
    await RedisTestDriver.start('latest', VALKEY);
    config = RedisTestDriver.config;

    const server = createServer(config);
    connection = server.createConnection('0');
    await connection.connect();
  });

  afterAll(async () => {
    if (connection) {
      await connection.disconnect();
    }
    await RedisTestDriver.stop();
  });

  describe('Connection', () => {
    it('should connect using the valkey connection type', async () => {
      expect(connection).toBeDefined();
      expect(config.client).toBe('valkey');
    });

    it('should report the valkey version rather than the redis compat version', async () => {
      const version = await connection.versionString();
      expect(version).toBeDefined();
      expect(version).not.toBe('Unknown');

      const info = await connection.executeQuery('INFO server');
      const fields = Object.fromEntries(
        info[0].rows.map((row) => [row.field, row.value])
      );

      // Valkey pins redis_version at the fork point and reports its own
      // version separately - versionString should prefer the latter.
      expect(fields.valkey_version).toBeDefined();
      expect(version).toBe(fields.valkey_version);
    });
  });

  describe('Commands', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute SET and GET commands', async () => {
      const setResult = await connection.executeQuery('SET test:key "hello valkey"');
      expect(setResult[0].rows).toEqual([{ result: 'OK' }]);

      const getResult = await connection.executeQuery('GET test:key');
      expect(getResult[0].rows).toEqual([{ result: 'hello valkey' }]);
    });

    it('should execute hash commands', async () => {
      await connection.executeQuery('HSET test:hash field1 "value1" field2 "value2"');

      const result = await connection.executeQuery('HGETALL test:hash');
      expect(result[0].rows).toEqual([
        { field: 'field1', value: 'value1' },
        { field: 'field2', value: 'value2' },
      ]);
    });

    it('should execute list commands', async () => {
      await connection.executeQuery('RPUSH test:list "a" "b" "c"');

      const result = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(result[0].rows).toEqual([
        { result: 'a' },
        { result: 'b' },
        { result: 'c' },
      ]);
    });

    it('should report errors for unknown commands', async () => {
      const result = await connection.executeQuery('NOTAVALKEYCOMMAND foo');
      expect(result[0].rows[0]).toHaveProperty('error');
    });
  });

  describe('Metadata', () => {
    it('should list databases', async () => {
      const databases = await connection.listDatabases();
      expect(Array.isArray(databases)).toBe(true);
      expect(databases).toContain('0');
    });

    it('should list the keys table', async () => {
      const tables = await connection.listTables();
      expect(tables).toEqual([
        { name: 'keys', entityType: 'table', schema: null },
      ]);
    });

    it('should list the info view', async () => {
      const views = await connection.listViews();
      expect(views).toEqual([
        { name: 'info', entityType: 'view', schema: null },
      ]);
    });
  });

  describe('Data retrieval', () => {
    beforeAll(async () => {
      await connection.executeQuery('SET valkey:test:string "a string"');
      await connection.executeQuery('HSET valkey:test:hash field "a value"');
    });

    afterAll(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should select top from the keys table', async () => {
      const result = await connection.selectTop('keys', 0, 10, [], []);

      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result.length).toBeGreaterThan(0);

      const firstRow = result.result[0];
      expect(firstRow).toHaveProperty('key');
      expect(firstRow).toHaveProperty('value');
      expect(firstRow).toHaveProperty('type');
      expect(firstRow).toHaveProperty('ttl');
      expect(firstRow).toHaveProperty('memory');
      expect(firstRow).toHaveProperty('encoding');
    });
  });
});
