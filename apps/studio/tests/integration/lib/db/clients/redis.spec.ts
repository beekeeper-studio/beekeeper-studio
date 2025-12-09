import { dbtimeout } from "@tests/lib/db";
import { StartedTestContainer } from "testcontainers";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { createServer } from "@commercial/backend/lib/db/server";
import { RedisTestDriver } from "./redis/container";

describe('Redis', () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let connection: BasicDatabaseClient<any>;
  let config;

  beforeAll(async () => {
    await RedisTestDriver.start('latest');
    container = RedisTestDriver.container;
    config = RedisTestDriver.config;

    const server = createServer(config);
    connection = server.createConnection('0'); // Redis database 0
    await connection.connect();
  });

  afterAll(async () => {
    if (connection) {
      await connection.disconnect();
    }
    await RedisTestDriver.stop();
  });

  describe('Basic Redis Operations', () => {
    it('should connect to Redis', async () => {
      expect(connection).toBeDefined();
    });
  });

  describe('Redis Write Commands - String Operations', () => {
    afterEach(async () => {
      // Clean up test keys after each test
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute SET and GET commands', async () => {
      const setResult = await connection.executeQuery('SET test:key "hello world"');
      expect(setResult).toHaveLength(1);
      expect(setResult[0].command).toBe('SET test:key "hello world"');
      expect(setResult[0].rows).toEqual([{ result: 'OK' }]);

      const getResult = await connection.executeQuery('GET test:key');
      expect(getResult).toHaveLength(1);
      expect(getResult[0].rows).toEqual([{ result: 'hello world' }]);
    });

    it('should execute SETEX command with expiration', async () => {
      const result = await connection.executeQuery('SETEX test:expiry 10 "expires in 10 seconds"');
      expect(result[0].rows).toEqual([{ result: 'OK' }]);

      const getResult = await connection.executeQuery('GET test:expiry');
      expect(getResult[0].rows).toEqual([{ result: 'expires in 10 seconds' }]);

      const ttlResult = await connection.executeQuery('TTL test:expiry');
      expect(ttlResult[0].rows[0].result).toBeGreaterThan(0);
      expect(ttlResult[0].rows[0].result).toBeLessThanOrEqual(10);
    });

    it('should execute SETNX command', async () => {
      const result1 = await connection.executeQuery('SETNX test:nx "first value"');
      expect(result1[0].rows).toEqual([{ result: 1 }]);

      const result2 = await connection.executeQuery('SETNX test:nx "second value"');
      expect(result2[0].rows).toEqual([{ result: 0 }]);

      const getResult = await connection.executeQuery('GET test:nx');
      expect(getResult[0].rows).toEqual([{ result: 'first value' }]);
    });

    it('should execute MSET and MGET commands', async () => {
      const msetResult = await connection.executeQuery('MSET test:key1 "value1" test:key2 "value2" test:key3 "value3"');
      expect(msetResult[0].rows).toEqual([{ result: 'OK' }]);

      const mgetResult = await connection.executeQuery('MGET test:key1 test:key2 test:key3');
      expect(mgetResult[0].rows).toEqual([{ result: 'value1' }, { result: 'value2' }, { result: 'value3' }]);
    });
  });

  describe('Redis Write Commands - List Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute LPUSH and LRANGE commands', async () => {
      const lpushResult = await connection.executeQuery('LPUSH test:list "item3" "item2" "item1"');
      expect(lpushResult[0].rows[0].result).toBe(3);

      const lrangeResult = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(lrangeResult[0].rows).toEqual([{ result: 'item1' }, { result: 'item2' }, { result: 'item3' }]);
    });

    it('should execute RPUSH and RPOP commands', async () => {
      const rpushResult = await connection.executeQuery('RPUSH test:list "first" "second" "third"');
      expect(rpushResult[0].rows[0].result).toBe(3);

      const rpopResult = await connection.executeQuery('RPOP test:list');
      expect(rpopResult[0].rows).toEqual([{ result: 'third' }]);

      const lrangeResult = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(lrangeResult[0].rows).toEqual([{ result: 'first' }, { result: 'second' }]);
    });

    it('should execute LINSERT command', async () => {
      await connection.executeQuery('RPUSH test:list "one" "three"');

      const linsertResult = await connection.executeQuery('LINSERT test:list BEFORE "three" "two"');
      expect(linsertResult[0].rows[0].result).toBe(3);

      const lrangeResult = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(lrangeResult[0].rows).toEqual([{ result: 'one' }, { result: 'two' }, { result: 'three' }]);
    });

    it('should execute LSET command', async () => {
      await connection.executeQuery('RPUSH test:list "zero" "one" "two"');

      const lsetResult = await connection.executeQuery('LSET test:list 1 "modified"');
      expect(lsetResult[0].rows).toEqual([{ result: 'OK' }]);

      const lrangeResult = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(lrangeResult[0].rows).toEqual([{ result: 'zero' }, { result: 'modified' }, { result: 'two' }]);
    });
  });

  describe('Redis Write Commands - Hash Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute HSET and HGET commands', async () => {
      const hsetResult = await connection.executeQuery('HSET test:hash field1 "value1"');
      expect(hsetResult[0].rows[0].result).toBe(1);

      const hgetResult = await connection.executeQuery('HGET test:hash field1');
      expect(hgetResult[0].rows).toEqual([{ result: 'value1' }]);
    });

    it('should execute HMSET and HGETALL commands', async () => {
      const hmsetResult = await connection.executeQuery('HMSET test:hash field1 "value1" field2 "value2" field3 "value3"');
      expect(hmsetResult[0].rows).toEqual([{ result: 'OK' }]);

      const hgetallResult = await connection.executeQuery('HGETALL test:hash');
      expect(hgetallResult[0].rows).toEqual([
        { field: "field1", value: "value1" },
        { field: "field2", value: "value2" },
        { field: "field3", value: "value3" }
      ]);
    });

    it('should execute HDEL command', async () => {
      await connection.executeQuery('HMSET test:hash field1 "value1" field2 "value2" field3 "value3"');

      const hdelResult = await connection.executeQuery('HDEL test:hash field2');
      expect(hdelResult[0].rows[0].result).toBe(1);

      const hgetallResult = await connection.executeQuery('HGETALL test:hash');
      expect(hgetallResult[0].rows).toEqual([
        { field: "field1", value: "value1" },
        { field: "field3", value: "value3" }
      ]);
    });

    it('should execute HEXISTS command', async () => {
      await connection.executeQuery('HSET test:hash field1 "value1"');

      const hexistsResult1 = await connection.executeQuery('HEXISTS test:hash field1');
      expect(hexistsResult1[0].rows[0].result).toBe(1);

      const hexistsResult2 = await connection.executeQuery('HEXISTS test:hash field2');
      expect(hexistsResult2[0].rows[0].result).toBe(0);
    });
  });

  describe('Redis Write Commands - Set Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute SADD and SMEMBERS commands', async () => {
      const saddResult = await connection.executeQuery('SADD test:set "member1" "member2" "member3"');
      expect(saddResult[0].rows[0].result).toBe(3);

      const smembersResult = await connection.executeQuery('SMEMBERS test:set');
      const members = smembersResult[0].rows.map(row => row.result);
      expect(members).toHaveLength(3);
      expect(members).toContain('member1');
      expect(members).toContain('member2');
      expect(members).toContain('member3');
    });

    it('should execute SREM command', async () => {
      await connection.executeQuery('SADD test:set "member1" "member2" "member3"');

      const sremResult = await connection.executeQuery('SREM test:set "member2"');
      expect(sremResult[0].rows[0].result).toBe(1);

      const smembersResult = await connection.executeQuery('SMEMBERS test:set');
      const members = smembersResult[0].rows.map(row => row.result);
      expect(members).toHaveLength(2);
      expect(members).not.toContain('member2');
    });

    it('should execute SISMEMBER command', async () => {
      await connection.executeQuery('SADD test:set "member1"');

      const sismemberResult1 = await connection.executeQuery('SISMEMBER test:set "member1"');
      expect(sismemberResult1[0].rows[0].result).toBe(1);

      const sismemberResult2 = await connection.executeQuery('SISMEMBER test:set "member2"');
      expect(sismemberResult2[0].rows[0].result).toBe(0);
    });
  });

  describe('Redis Write Commands - Sorted Set Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute ZADD and ZRANGE commands', async () => {
      const zaddResult = await connection.executeQuery('ZADD test:zset 1 "member1" 2 "member2" 3 "member3"');
      expect(zaddResult[0].rows[0].result).toBe(3);

      const zrangeResult = await connection.executeQuery('ZRANGE test:zset 0 -1');
      expect(zrangeResult[0].rows).toEqual([{ result: 'member1' }, { result: 'member2' }, { result: 'member3' }]);
    });

    it('should execute ZREM command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "member1" 2 "member2" 3 "member3"');

      const zremResult = await connection.executeQuery('ZREM test:zset "member2"');
      expect(zremResult[0].rows[0].result).toBe(1);

      const zrangeResult = await connection.executeQuery('ZRANGE test:zset 0 -1');
      expect(zrangeResult[0].rows).toEqual([{ result: 'member1' }, { result: 'member3' }]);
    });

    it('should execute ZSCORE command', async () => {
      await connection.executeQuery('ZADD test:zset 2.5 "member1"');

      const zscoreResult = await connection.executeQuery('ZSCORE test:zset "member1"');
      expect(zscoreResult[0].rows).toEqual([{ result: 2.5 }]);
    });
  });

  describe('Redis Write Commands - Expiration', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute EXPIRE and TTL commands', async () => {
      await connection.executeQuery('SET test:expire "value"');

      const expireResult = await connection.executeQuery('EXPIRE test:expire 30');
      expect(expireResult[0].rows[0].result).toBe(1);

      const ttlResult = await connection.executeQuery('TTL test:expire');
      expect(ttlResult[0].rows[0].result).toBeGreaterThan(0);
      expect(ttlResult[0].rows[0].result).toBeLessThanOrEqual(30);
    });

    it('should execute PERSIST command', async () => {
      await connection.executeQuery('SETEX test:persist 30 "value"');

      const persistResult = await connection.executeQuery('PERSIST test:persist');
      expect(persistResult[0].rows[0].result).toBe(1);

      const ttlResult = await connection.executeQuery('TTL test:persist');
      expect(ttlResult[0].rows[0].result).toBe(-1);
    });
  });

  describe('Redis Write Commands - Increment/Decrement', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute INCR and DECR commands', async () => {
      const incrResult1 = await connection.executeQuery('INCR test:counter');
      expect(incrResult1[0].rows[0].result).toBe(1);

      const incrResult2 = await connection.executeQuery('INCR test:counter');
      expect(incrResult2[0].rows[0].result).toBe(2);

      const decrResult = await connection.executeQuery('DECR test:counter');
      expect(decrResult[0].rows[0].result).toBe(1);
    });

    it('should execute INCRBY and DECRBY commands', async () => {
      await connection.executeQuery('SET test:counter 10');

      const incrbyResult = await connection.executeQuery('INCRBY test:counter 5');
      expect(incrbyResult[0].rows[0].result).toBe(15);

      const decrbyResult = await connection.executeQuery('DECRBY test:counter 8');
      expect(decrbyResult[0].rows[0].result).toBe(7);
    });

    it('should execute INCRBYFLOAT command', async () => {
      await connection.executeQuery('SET test:float 10.5');

      const incrbyfloatResult = await connection.executeQuery('INCRBYFLOAT test:float 2.1');
      expect(parseFloat(incrbyfloatResult[0].rows[0].result)).toBeCloseTo(12.6);
    });
  });

  describe('Redis Write Commands - Key Management', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute DEL command', async () => {
      await connection.executeQuery('SET test:key1 "value1"');
      await connection.executeQuery('SET test:key2 "value2"');

      const delResult = await connection.executeQuery('DEL test:key1 test:key2');
      expect(delResult[0].rows[0].result).toBe(2);

      const getResult = await connection.executeQuery('GET test:key1');
      expect(getResult[0].rows).toEqual([{ result: null }]);
    });

    it('should execute EXISTS command', async () => {
      await connection.executeQuery('SET test:exists "value"');

      const existsResult1 = await connection.executeQuery('EXISTS test:exists');
      expect(existsResult1[0].rows[0].result).toBe(1);

      const existsResult2 = await connection.executeQuery('EXISTS test:nonexistent');
      expect(existsResult2[0].rows[0].result).toBe(0);
    });

    it('should execute RENAME command', async () => {
      await connection.executeQuery('SET test:oldname "value"');

      const renameResult = await connection.executeQuery('RENAME test:oldname test:newname');
      expect(renameResult[0].rows).toEqual([{ result: 'OK' }]);

      const getResult = await connection.executeQuery('GET test:newname');
      expect(getResult[0].rows).toEqual([{ result: 'value' }]);

      const oldResult = await connection.executeQuery('GET test:oldname');
      expect(oldResult[0].rows).toEqual([{ result: null }]);
    });

    it('should execute COPY command', async () => {
      await connection.executeQuery('SET test:source "value"');

      const copyResult = await connection.executeQuery('COPY test:source test:destination');
      expect(copyResult[0].rows[0].result).toBe(1);

      const sourceResult = await connection.executeQuery('GET test:source');
      expect(sourceResult[0].rows).toEqual([{ result: 'value' }]);

      const destResult = await connection.executeQuery('GET test:destination');
      expect(destResult[0].rows).toEqual([{ result: 'value' }]);
    });

    it('should execute TYPE command', async () => {
      await connection.executeQuery('SET test:string "value"');
      await connection.executeQuery('LPUSH test:list "item"');
      await connection.executeQuery('HSET test:hash field "value"');

      const stringType = await connection.executeQuery('TYPE test:string');
      expect(stringType[0].rows).toEqual([{ result: 'string' }]);

      const listType = await connection.executeQuery('TYPE test:list');
      expect(listType[0].rows).toEqual([{ result: 'list' }]);

      const hashType = await connection.executeQuery('TYPE test:hash');
      expect(hashType[0].rows).toEqual([{ result: 'hash' }]);
    });
  });

  describe('Redis Write Commands - Advanced List Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute LTRIM command', async () => {
      await connection.executeQuery('RPUSH test:list "item1" "item2" "item3" "item4" "item5"');

      const ltrimResult = await connection.executeQuery('LTRIM test:list 1 3');
      expect(ltrimResult[0].rows).toEqual([{ result: 'OK' }]);

      const lrangeResult = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(lrangeResult[0].rows).toEqual([{ result: 'item2' }, { result: 'item3' }, { result: 'item4' }]);
    });

    it('should execute LREM command', async () => {
      await connection.executeQuery('RPUSH test:list "a" "b" "a" "c" "a"');

      const lremResult = await connection.executeQuery('LREM test:list 2 "a"');
      expect(lremResult[0].rows[0].result).toBe(2);

      const lrangeResult = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(lrangeResult[0].rows).toEqual([{ result: 'b' }, { result: 'c' }, { result: 'a' }]);
    });

    it('should execute LLEN command', async () => {
      await connection.executeQuery('RPUSH test:list "item1" "item2" "item3"');

      const llenResult = await connection.executeQuery('LLEN test:list');
      expect(llenResult[0].rows[0].result).toBe(3);
    });

    it('should execute LINDEX command', async () => {
      await connection.executeQuery('RPUSH test:list "zero" "one" "two"');

      const lindexResult = await connection.executeQuery('LINDEX test:list 1');
      expect(lindexResult[0].rows).toEqual([{ result: 'one' }]);
    });
  });

  describe('Redis Write Commands - Advanced Hash Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute HINCRBY command', async () => {
      await connection.executeQuery('HSET test:hash counter 10');

      const hincrbyResult = await connection.executeQuery('HINCRBY test:hash counter 5');
      expect(hincrbyResult[0].rows[0].result).toBe(15);

      const hgetResult = await connection.executeQuery('HGET test:hash counter');
      expect(hgetResult[0].rows).toEqual([{ result: '15' }]);
    });

    it('should execute HINCRBYFLOAT command', async () => {
      await connection.executeQuery('HSET test:hash price 10.50');

      const hincrbyfloatResult = await connection.executeQuery('HINCRBYFLOAT test:hash price 2.1');
      expect(parseFloat(hincrbyfloatResult[0].rows[0].result)).toBeCloseTo(12.6);
    });

    it('should execute HLEN command', async () => {
      await connection.executeQuery('HMSET test:hash field1 "value1" field2 "value2" field3 "value3"');

      const hlenResult = await connection.executeQuery('HLEN test:hash');
      expect(hlenResult[0].rows[0].result).toBe(3);
    });

    it('should execute HKEYS and HVALS commands', async () => {
      await connection.executeQuery('HMSET test:hash field1 "value1" field2 "value2"');

      const hkeysResult = await connection.executeQuery('HKEYS test:hash');
      const keys = hkeysResult[0].rows.map(row => row.result);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('field1');
      expect(keys).toContain('field2');

      const hvalsResult = await connection.executeQuery('HVALS test:hash');
      const values = hvalsResult[0].rows.map(row => row.result);
      expect(values).toHaveLength(2);
      expect(values).toContain('value1');
      expect(values).toContain('value2');
    });
  });

  describe('Redis Write Commands - Advanced Set Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute SCARD command', async () => {
      await connection.executeQuery('SADD test:set "member1" "member2" "member3"');

      const scardResult = await connection.executeQuery('SCARD test:set');
      expect(scardResult[0].rows[0].result).toBe(3);
    });

    it('should execute SPOP command', async () => {
      await connection.executeQuery('SADD test:set "member1" "member2" "member3"');

      const spopResult = await connection.executeQuery('SPOP test:set');
      expect(spopResult[0].rows).toHaveLength(1);
      expect(['member1', 'member2', 'member3']).toContain(spopResult[0].rows[0].result);

      const scardResult = await connection.executeQuery('SCARD test:set');
      expect(scardResult[0].rows[0].result).toBe(2);
    });

    it('should execute SUNION command', async () => {
      await connection.executeQuery('SADD test:set1 "a" "b" "c"');
      await connection.executeQuery('SADD test:set2 "c" "d" "e"');

      const sunionResult = await connection.executeQuery('SUNION test:set1 test:set2');
      const union = sunionResult[0].rows.map(row => row.result);
      expect(union).toHaveLength(5);
      expect(union).toContain('a');
      expect(union).toContain('b');
      expect(union).toContain('c');
      expect(union).toContain('d');
      expect(union).toContain('e');
    });

    it('should execute SINTER command', async () => {
      await connection.executeQuery('SADD test:set1 "a" "b" "c"');
      await connection.executeQuery('SADD test:set2 "b" "c" "d"');

      const sinterResult = await connection.executeQuery('SINTER test:set1 test:set2');
      const intersection = sinterResult[0].rows.map(row => row.result);
      expect(intersection).toHaveLength(2);
      expect(intersection).toContain('b');
      expect(intersection).toContain('c');
    });

    it('should execute SDIFF command', async () => {
      await connection.executeQuery('SADD test:set1 "a" "b" "c"');
      await connection.executeQuery('SADD test:set2 "b" "c" "d"');

      const sdiffResult = await connection.executeQuery('SDIFF test:set1 test:set2');
      const diff = sdiffResult[0].rows.map(row => row.result);
      expect(diff).toHaveLength(1);
      expect(diff).toContain('a');
    });
  });

  describe('Redis Write Commands - Advanced Sorted Set Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute ZCARD command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "member1" 2 "member2" 3 "member3"');

      const zcardResult = await connection.executeQuery('ZCARD test:zset');
      expect(zcardResult[0].rows[0].result).toBe(3);
    });

    it('should execute ZINCRBY command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "member1"');

      const zincrbyResult = await connection.executeQuery('ZINCRBY test:zset 2 "member1"');
      expect(zincrbyResult[0].rows).toEqual([{ result: 3 }]);

      const zscoreResult = await connection.executeQuery('ZSCORE test:zset "member1"');
      expect(zscoreResult[0].rows).toEqual([{ result: 3 }]);
    });

    it('should execute ZRANK command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "member1" 2 "member2" 3 "member3"');

      const zrankResult = await connection.executeQuery('ZRANK test:zset "member2"');
      expect(zrankResult[0].rows[0].result).toBe(1);
    });

    it('should execute ZREVRANK command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "member1" 2 "member2" 3 "member3"');

      const zrevrankResult = await connection.executeQuery('ZREVRANK test:zset "member2"');
      expect(zrevrankResult[0].rows[0].result).toBe(1);
    });

    it('should execute ZREVRANGE command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "member1" 2 "member2" 3 "member3"');

      const zrevrangeResult = await connection.executeQuery('ZREVRANGE test:zset 0 -1');
      expect(zrevrangeResult[0].rows).toEqual([{ result: 'member3' }, { result: 'member2' }, { result: 'member1' }]);
    });
  });

  describe('Redis Write Commands - Bit Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute SETBIT and GETBIT commands', async () => {
      const setbitResult = await connection.executeQuery('SETBIT test:bits 7 1');
      expect(setbitResult[0].rows[0].result).toBe(0);

      const getbitResult = await connection.executeQuery('GETBIT test:bits 7');
      expect(getbitResult[0].rows[0].result).toBe(1);

      const getbitResult0 = await connection.executeQuery('GETBIT test:bits 0');
      expect(getbitResult0[0].rows[0].result).toBe(0);
    });

    it('should execute BITCOUNT command', async () => {
      // Set individual bits to create a known pattern
      await connection.executeQuery('SETBIT test:bits 0 1');
      await connection.executeQuery('SETBIT test:bits 1 1');
      await connection.executeQuery('SETBIT test:bits 2 1');
      await connection.executeQuery('SETBIT test:bits 7 1');

      const bitcountResult = await connection.executeQuery('BITCOUNT test:bits');
      expect(bitcountResult[0].rows[0].result).toBe(4);
    });

    it('should execute BITOP command', async () => {
      // Create two bit patterns using SETBIT
      // test:bits1: set bits 0,1,2,3,4,5,6,7 (all bits in first byte)
      for (let i = 0; i < 8; i++) {
        await connection.executeQuery(`SETBIT test:bits1 ${i} 1`);
      }

      // test:bits2: set bits 0,1,2,3 (first 4 bits)
      for (let i = 0; i < 4; i++) {
        await connection.executeQuery(`SETBIT test:bits2 ${i} 1`);
      }

      const bitopResult = await connection.executeQuery('BITOP AND test:result test:bits1 test:bits2');
      expect(bitopResult[0].rows[0].result).toBeGreaterThan(0); // Returns bytes processed

      const bitcountResult = await connection.executeQuery('BITCOUNT test:result');
      expect(bitcountResult[0].rows[0].result).toBe(4); // AND of all bits with first 4 bits = 4 bits
    });
  });

  describe('Redis Write Commands - Stream Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute XADD and XLEN commands', async () => {
      const xaddResult = await connection.executeQuery('XADD test:stream * field1 value1 field2 value2');
      expect(xaddResult[0].rows).toHaveLength(1);
      expect(xaddResult[0].rows[0].result).toMatch(/^\d+-\d+$/);

      const xlenResult = await connection.executeQuery('XLEN test:stream');
      expect(xlenResult[0].rows[0].result).toBe(1);
    });

    it('should execute XRANGE command', async () => {
      await connection.executeQuery('XADD test:stream * field1 value1');
      await connection.executeQuery('XADD test:stream * field2 value2');

      const xrangeResult = await connection.executeQuery('XRANGE test:stream - +');
      expect(xrangeResult[0].rows).toHaveLength(2);
    });

    it('should execute XTRIM command', async () => {
      await connection.executeQuery('XADD test:stream * field1 value1');
      await connection.executeQuery('XADD test:stream * field2 value2');
      await connection.executeQuery('XADD test:stream * field3 value3');

      const xtrimResult = await connection.executeQuery('XTRIM test:stream MAXLEN 2');
      expect(xtrimResult[0].rows[0].result).toBe(1);

      const xlenResult = await connection.executeQuery('XLEN test:stream');
      expect(xlenResult[0].rows[0].result).toBe(2);
    });
  });

  describe('Redis Write Commands - Server Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute PING command', async () => {
      const pingResult = await connection.executeQuery('PING');
      expect(pingResult[0].rows).toEqual([{ result: 'PONG' }]);
    });

    it('should execute ECHO command', async () => {
      const echoResult = await connection.executeQuery('ECHO "Hello World"');
      expect(echoResult[0].rows).toEqual([{ result: 'Hello World' }]);
    });

    it('should execute TIME command', async () => {
      const timeResult = await connection.executeQuery('TIME');
      expect(timeResult[0].rows).toHaveLength(2);
      expect(timeResult[0].rows[0].result).toMatch(/^\d+$/);
      expect(timeResult[0].rows[1].result).toMatch(/^\d+$/);
    });

    it('should execute DBSIZE command', async () => {
      await connection.executeQuery('SET test:key1 "value1"');
      await connection.executeQuery('SET test:key2 "value2"');

      const dbsizeResult = await connection.executeQuery('DBSIZE');
      expect(dbsizeResult[0].rows[0].result).toBe(2);
    });

    it('should execute KEYS command', async () => {
      await connection.executeQuery('SET test:key1 "value1"');
      await connection.executeQuery('SET test:key2 "value2"');
      await connection.executeQuery('SET other:key "value"');

      const keysResult = await connection.executeQuery('KEYS test:*');
      const keys = keysResult[0].rows.map(row => row.result);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('test:key1');
      expect(keys).toContain('test:key2');
    });

    it('should execute RANDOMKEY command', async () => {
      await connection.executeQuery('SET test:key1 "value1"');
      await connection.executeQuery('SET test:key2 "value2"');

      const randomkeyResult = await connection.executeQuery('RANDOMKEY');
      expect(['test:key1', 'test:key2']).toContain(randomkeyResult[0].rows[0].result);
    });
  });

  describe('Redis Write Commands - Transaction Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute basic transaction commands', async () => {
      // Note: Redis transactions work differently - MULTI returns a pipeline object
      // For testing purposes, we'll test individual commands that would be part of transactions

      // Test WATCH command
      const watchResult = await connection.executeQuery('WATCH test:watched');
      expect(watchResult[0].rows).toEqual([{ result: 'OK' }]);

      // Test UNWATCH command
      const unwatchResult = await connection.executeQuery('UNWATCH');
      expect(unwatchResult[0].rows).toEqual([{ result: 'OK' }]);
    });

    it('should handle conditional operations', async () => {
      // Test conditional SET operations which are often used in transactions
      await connection.executeQuery('SET test:conditional "initial"');

      // SETNX should fail since key exists
      const setnxResult = await connection.executeQuery('SETNX test:conditional "new value"');
      expect(setnxResult[0].rows[0].result).toBe(0);

      const getValue = await connection.executeQuery('GET test:conditional');
      expect(getValue[0].rows).toEqual([{ result: 'initial' }]);
    });
  });

  describe('Redis Write Commands - String Pattern Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute APPEND command', async () => {
      await connection.executeQuery('SET test:string "Hello"');

      const appendResult = await connection.executeQuery('APPEND test:string " World"');
      expect(appendResult[0].rows[0].result).toBe(11);

      const getResult = await connection.executeQuery('GET test:string');
      expect(getResult[0].rows).toEqual([{ result: 'Hello World' }]);
    });

    it('should execute STRLEN command', async () => {
      await connection.executeQuery('SET test:string "Hello World"');

      const strlenResult = await connection.executeQuery('STRLEN test:string');
      expect(strlenResult[0].rows[0].result).toBe(11);
    });

    it('should execute GETRANGE and SETRANGE commands', async () => {
      await connection.executeQuery('SET test:string "Hello World"');

      const getrangeResult = await connection.executeQuery('GETRANGE test:string 6 10');
      expect(getrangeResult[0].rows).toEqual([{ result: 'World' }]);

      const setrangeResult = await connection.executeQuery('SETRANGE test:string 6 "Redis"');
      expect(setrangeResult[0].rows[0].result).toBe(11);

      const getResult = await connection.executeQuery('GET test:string');
      expect(getResult[0].rows).toEqual([{ result: 'Hello Redis' }]);
    });
  });

  describe('Redis Write Commands - Lua Script Execution', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute simple EVAL command', async () => {
      // Use a simple script without complex quoting
      const evalResult = await connection.executeQuery('EVAL "return redis.call(\'SET\', KEYS[1], ARGV[1])" 1 test:script "script value"');
      expect(evalResult[0].rows).toEqual([{ result: 'OK' }]);

      const getResult = await connection.executeQuery('GET test:script');
      expect(getResult[0].rows).toEqual([{ result: 'script value' }]);
    });

    it('should execute EVAL with return value', async () => {
      await connection.executeQuery('SET test:script "hello from lua"');

      const evalResult = await connection.executeQuery('EVAL "return redis.call(\'GET\', KEYS[1])" 1 test:script');
      expect(evalResult[0].rows).toEqual([{ result: 'hello from lua' }]);
    });

    it('should execute SCRIPT LOAD and EVALSHA', async () => {
      // Load a simple script
      const loadResult = await connection.executeQuery('SCRIPT LOAD "return redis.call(\'SET\', KEYS[1], ARGV[1])"');
      const sha = loadResult[0].rows[0].result;
      expect(sha).toMatch(/^[a-f0-9]{40}$/);

      // Execute using SHA
      const evalshaResult = await connection.executeQuery(`EVALSHA ${sha} 1 test:sha "sha value"`);
      expect(evalshaResult[0].rows).toEqual([{ result: 'OK' }]);

      const getResult = await connection.executeQuery('GET test:sha');
      expect(getResult[0].rows).toEqual([{ result: 'sha value' }]);
    });

    it('should execute SCRIPT commands', async () => {
      // Test SCRIPT FLUSH
      const flushResult = await connection.executeQuery('SCRIPT FLUSH');
      expect(flushResult[0].rows).toEqual([{ result: 'OK' }]);

      // Test SCRIPT EXISTS
      const existsResult = await connection.executeQuery('SCRIPT EXISTS nonexistent');
      expect(existsResult[0].rows[0].result).toBe(0);
    });
  });

  describe('Redis Write Commands - Pub/Sub Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute PUBLISH command', async () => {
      const publishResult = await connection.executeQuery('PUBLISH test:channel "hello world"');
      expect(publishResult[0].rows[0].result).toBe(0); // No subscribers
    });

    it('should execute PUBSUB CHANNELS command', async () => {
      // Publish to create channel activity
      await connection.executeQuery('PUBLISH test:channel1 "message"');
      await connection.executeQuery('PUBLISH test:channel2 "message"');

      const channelsResult = await connection.executeQuery('PUBSUB CHANNELS');
      const channels = channelsResult[0].rows.map(row => row.result);
      // Note: channels might be empty if no active subscribers
      expect(channels).toEqual(expect.any(Array));
    });

    it('should execute PUBSUB NUMSUB command', async () => {
      const numsubResult = await connection.executeQuery('PUBSUB NUMSUB test:channel');
      expect(numsubResult[0].rows).toEqual([
        { field: "test:channel", value: "0" }
      ]);
    });

    it('should execute PUBSUB NUMPAT command', async () => {
      const numpatResult = await connection.executeQuery('PUBSUB NUMPAT');
      expect(numpatResult[0].rows[0].result).toBe(0); // No pattern subscribers
    });
  });

  describe('Redis Write Commands - HyperLogLog Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute PFADD and PFCOUNT commands', async () => {
      const pfaddResult = await connection.executeQuery('PFADD test:hll "element1" "element2" "element3"');
      expect(pfaddResult[0].rows[0].result).toBe(1);

      const pfcountResult = await connection.executeQuery('PFCOUNT test:hll');
      expect(pfcountResult[0].rows[0].result).toBe(3);

      // Adding existing elements should not change count
      const pfaddResult2 = await connection.executeQuery('PFADD test:hll "element1" "element2"');
      expect(pfaddResult2[0].rows[0].result).toBe(0);

      const pfcountResult2 = await connection.executeQuery('PFCOUNT test:hll');
      expect(pfcountResult2[0].rows[0].result).toBe(3);
    });

    it('should execute PFMERGE command', async () => {
      await connection.executeQuery('PFADD test:hll1 "element1" "element2"');
      await connection.executeQuery('PFADD test:hll2 "element2" "element3"');

      const pfmergeResult = await connection.executeQuery('PFMERGE test:merged test:hll1 test:hll2');
      expect(pfmergeResult[0].rows).toEqual([{ result: 'OK' }]);

      const pfcountResult = await connection.executeQuery('PFCOUNT test:merged');
      expect(pfcountResult[0].rows[0].result).toBe(3); // Unique elements: element1, element2, element3
    });
  });

  describe('Redis Write Commands - Geospatial Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute GEOADD and GEOPOS commands', async () => {
      const geoaddResult = await connection.executeQuery('GEOADD test:geo 13.361389 38.115556 "Palermo" 15.087269 37.502669 "Catania"');
      expect(geoaddResult[0].rows[0].result).toBe(2);

      const geoposResult = await connection.executeQuery('GEOPOS test:geo "Palermo" "Catania"');
      expect(geoposResult[0].rows).toEqual([
        { "longitude": "13.361389338970184", "latitude": "38.1155563954963" },
        { "longitude": "15.087267458438873", "latitude": "37.50266842333162" }
      ]);
    });

    it('should execute GEODIST command', async () => {
      await connection.executeQuery('GEOADD test:geo 13.361389 38.115556 "Palermo" 15.087269 37.502669 "Catania"');

      const geodistResult = await connection.executeQuery('GEODIST test:geo "Palermo" "Catania" km');
      const distance = parseFloat(geodistResult[0].rows[0].result);
      expect(distance).toBeGreaterThan(160); // Approximate distance between cities
      expect(distance).toBeLessThan(170);
    });

    it('should execute GEORADIUS command', async () => {
      await connection.executeQuery('GEOADD test:geo 13.361389 38.115556 "Palermo" 15.087269 37.502669 "Catania"');

      const georadiusResult = await connection.executeQuery('GEORADIUS test:geo 15 37 200 km');
      const cities = georadiusResult[0].rows.map(row => row.result);
      expect(cities).toContain('Palermo');
      expect(cities).toContain('Catania');
    });
  });

  describe('Redis Write Commands - Database Management', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute FLUSHDB command', async () => {
      await connection.executeQuery('SET test:key1 "value1"');
      await connection.executeQuery('SET test:key2 "value2"');

      const flushdbResult = await connection.executeQuery('FLUSHDB');
      expect(flushdbResult[0].rows).toEqual([{ result: 'OK' }]);

      const dbsizeResult = await connection.executeQuery('DBSIZE');
      expect(dbsizeResult[0].rows[0].result).toBe(0);
    });

    it('should execute SELECT command', async () => {
      const selectResult = await connection.executeQuery('SELECT 1');
      expect(selectResult[0].rows).toEqual([{ result: 'OK' }]);

      // Set a key in database 1
      await connection.executeQuery('SET test:db1 "value"');

      // Switch back to database 0
      await connection.executeQuery('SELECT 0');

      // Key should not exist in database 0
      const getResult = await connection.executeQuery('GET test:db1');
      expect(getResult[0].rows).toEqual([{ result: null }]);
    });

    it('should execute MOVE command', async () => {
      await connection.executeQuery('SET test:move "value"');

      const moveResult = await connection.executeQuery('MOVE test:move 1');
      expect(moveResult[0].rows[0].result).toBe(1);

      // Key should not exist in current database (0)
      const getResult = await connection.executeQuery('GET test:move');
      expect(getResult[0].rows).toEqual([{ result: null }]);

      // Switch to database 1 to verify key exists there
      await connection.executeQuery('SELECT 1');
      const getResult1 = await connection.executeQuery('GET test:move');
      expect(getResult1[0].rows).toEqual([{ result: 'value' }]);

      // Clean up and switch back
      await connection.executeQuery('DEL test:move');
      await connection.executeQuery('SELECT 0');
    });
  });

  describe('Redis Additional Commands - String Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute GETDEL command', async () => {
      await connection.executeQuery('SET test:getdel "value"');

      const getdelResult = await connection.executeQuery('GETDEL test:getdel');
      expect(getdelResult[0].rows).toEqual([{ result: 'value' }]);

      const getResult = await connection.executeQuery('GET test:getdel');
      expect(getResult[0].rows).toEqual([{ result: null }]);
    });

    it('should execute GETEX command', async () => {
      await connection.executeQuery('SET test:getex "value"');

      const getexResult = await connection.executeQuery('GETEX test:getex EX 30');
      expect(getexResult[0].rows).toEqual([{ result: 'value' }]);

      const ttlResult = await connection.executeQuery('TTL test:getex');
      expect(ttlResult[0].rows[0].result).toBeGreaterThan(0);
    });

    it('should execute GETSET command', async () => {
      await connection.executeQuery('SET test:getset "old"');

      const getsetResult = await connection.executeQuery('GETSET test:getset "new"');
      expect(getsetResult[0].rows).toEqual([{ result: 'old' }]);

      const getResult = await connection.executeQuery('GET test:getset');
      expect(getResult[0].rows).toEqual([{ result: 'new' }]);
    });

    it('should execute MSETNX command', async () => {
      const msetnxResult1 = await connection.executeQuery('MSETNX test:key1 "value1" test:key2 "value2"');
      expect(msetnxResult1[0].rows[0].result).toBe(1);

      const msetnxResult2 = await connection.executeQuery('MSETNX test:key1 "newvalue1" test:key3 "value3"');
      expect(msetnxResult2[0].rows[0].result).toBe(0);
    });

    it('should execute PSETEX command', async () => {
      const psetexResult = await connection.executeQuery('PSETEX test:psetex 10000 "value"');
      expect(psetexResult[0].rows).toEqual([{ result: 'OK' }]);

      const pttlResult = await connection.executeQuery('PTTL test:psetex');
      expect(pttlResult[0].rows[0].result).toBeGreaterThan(0);
      expect(pttlResult[0].rows[0].result).toBeLessThanOrEqual(10000);
    });
  });

  describe('Redis Additional Commands - List Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute BLPOP command with timeout', async () => {
      await connection.executeQuery('LPUSH test:list "item"');

      const blpopResult = await connection.executeQuery('BLPOP test:list 1');
      expect(blpopResult[0].rows).toEqual([
        { field: 'key', value: 'test:list' },
        { field: 'element', value: 'item' }
      ]);
    });

    it('should execute BRPOP command with timeout', async () => {
      await connection.executeQuery('RPUSH test:list "item"');

      const brpopResult = await connection.executeQuery('BRPOP test:list 1');
      expect(brpopResult[0].rows).toEqual([
        { field: 'key', value: 'test:list' },
        { field: 'element', value: 'item' }
      ]);
    });

    it('should execute LMOVE command', async () => {
      await connection.executeQuery('RPUSH test:source "item1" "item2"');

      const lmoveResult = await connection.executeQuery('LMOVE test:source test:destination LEFT RIGHT');
      expect(lmoveResult[0].rows).toEqual([{ result: 'item1' }]);

      const destResult = await connection.executeQuery('LRANGE test:destination 0 -1');
      expect(destResult[0].rows).toEqual([{ result: 'item1' }]);
    });

    it('should execute LPUSHX command', async () => {
      const lpushxResult1 = await connection.executeQuery('LPUSHX test:nonexistent "item"');
      expect(lpushxResult1[0].rows[0].result).toBe(0);

      await connection.executeQuery('LPUSH test:existing "first"');
      const lpushxResult2 = await connection.executeQuery('LPUSHX test:existing "second"');
      expect(lpushxResult2[0].rows[0].result).toBe(2);
    });

    it('should execute RPUSHX command', async () => {
      const rpushxResult1 = await connection.executeQuery('RPUSHX test:nonexistent "item"');
      expect(rpushxResult1[0].rows[0].result).toBe(0);

      await connection.executeQuery('RPUSH test:existing "first"');
      const rpushxResult2 = await connection.executeQuery('RPUSHX test:existing "second"');
      expect(rpushxResult2[0].rows[0].result).toBe(2);
    });
  });

  describe('Redis Additional Commands - Hash Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute HMGET command', async () => {
      await connection.executeQuery('HMSET test:hash field1 "value1" field2 "value2" field3 "value3"');

      const hmgetResult = await connection.executeQuery('HMGET test:hash field1 field3 nonexistent');
      expect(hmgetResult[0].rows).toEqual([
        { result: 'value1' },
        { result: 'value3' },
        { result: null }
      ]);
    });

    it('should execute HSETNX command', async () => {
      const hsetnxResult1 = await connection.executeQuery('HSETNX test:hash field1 "value1"');
      expect(hsetnxResult1[0].rows[0].result).toBe(1);

      const hsetnxResult2 = await connection.executeQuery('HSETNX test:hash field1 "value2"');
      expect(hsetnxResult2[0].rows[0].result).toBe(0);

      const hgetResult = await connection.executeQuery('HGET test:hash field1');
      expect(hgetResult[0].rows).toEqual([{ result: 'value1' }]);
    });

    it('should execute HSTRLEN command', async () => {
      await connection.executeQuery('HSET test:hash field "hello world"');

      const hstrlenResult = await connection.executeQuery('HSTRLEN test:hash field');
      expect(hstrlenResult[0].rows[0].result).toBe(11);
    });

    it('should execute HRANDFIELD command', async () => {
      await connection.executeQuery('HMSET test:hash field1 "value1" field2 "value2" field3 "value3"');

      const hrandfieldResult = await connection.executeQuery('HRANDFIELD test:hash');
      const field = hrandfieldResult[0].rows[0].result;
      expect(['field1', 'field2', 'field3']).toContain(field);
    });
  });

  describe('Redis Additional Commands - Set Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute SRANDMEMBER command', async () => {
      await connection.executeQuery('SADD test:set "member1" "member2" "member3"');

      const srandmemberResult = await connection.executeQuery('SRANDMEMBER test:set');
      const member = srandmemberResult[0].rows[0].result;
      expect(['member1', 'member2', 'member3']).toContain(member);
    });

    it('should execute SMOVE command', async () => {
      await connection.executeQuery('SADD test:set1 "member1" "member2"');
      await connection.executeQuery('SADD test:set2 "member3"');

      const smoveResult = await connection.executeQuery('SMOVE test:set1 test:set2 "member1"');
      expect(smoveResult[0].rows[0].result).toBe(1);

      const sismemberResult1 = await connection.executeQuery('SISMEMBER test:set1 "member1"');
      expect(sismemberResult1[0].rows[0].result).toBe(0);

      const sismemberResult2 = await connection.executeQuery('SISMEMBER test:set2 "member1"');
      expect(sismemberResult2[0].rows[0].result).toBe(1);
    });

    it('should execute SDIFFSTORE command', async () => {
      await connection.executeQuery('SADD test:set1 "a" "b" "c"');
      await connection.executeQuery('SADD test:set2 "b" "c" "d"');

      const sdiffstoreResult = await connection.executeQuery('SDIFFSTORE test:result test:set1 test:set2');
      expect(sdiffstoreResult[0].rows[0].result).toBe(1);

      const smembersResult = await connection.executeQuery('SMEMBERS test:result');
      expect(smembersResult[0].rows).toEqual([{ result: 'a' }]);
    });

    it('should execute SINTERSTORE command', async () => {
      await connection.executeQuery('SADD test:set1 "a" "b" "c"');
      await connection.executeQuery('SADD test:set2 "b" "c" "d"');

      const sinterstoreResult = await connection.executeQuery('SINTERSTORE test:result test:set1 test:set2');
      expect(sinterstoreResult[0].rows[0].result).toBe(2);

      const smembersResult = await connection.executeQuery('SMEMBERS test:result');
      const members = smembersResult[0].rows.map(row => row.result);
      expect(members).toHaveLength(2);
      expect(members).toContain('b');
      expect(members).toContain('c');
    });

    it('should execute SUNIONSTORE command', async () => {
      await connection.executeQuery('SADD test:set1 "a" "b"');
      await connection.executeQuery('SADD test:set2 "b" "c"');

      const sunionstoreResult = await connection.executeQuery('SUNIONSTORE test:result test:set1 test:set2');
      expect(sunionstoreResult[0].rows[0].result).toBe(3);

      const smembersResult = await connection.executeQuery('SMEMBERS test:result');
      const members = smembersResult[0].rows.map(row => row.result);
      expect(members).toHaveLength(3);
      expect(members).toContain('a');
      expect(members).toContain('b');
      expect(members).toContain('c');
    });
  });

  describe('Redis Additional Commands - Sorted Set Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute ZCOUNT command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "one" 2 "two" 3 "three" 4 "four"');

      const zcountResult = await connection.executeQuery('ZCOUNT test:zset 2 3');
      expect(zcountResult[0].rows[0].result).toBe(2);
    });

    it('should execute ZRANGEBYSCORE command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "one" 2 "two" 3 "three"');

      const zrangebyscoreResult = await connection.executeQuery('ZRANGEBYSCORE test:zset 1 2');
      expect(zrangebyscoreResult[0].rows).toEqual([{ result: 'one' }, { result: 'two' }]);
    });

    it('should execute ZREVRANGEBYSCORE command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "one" 2 "two" 3 "three"');

      const zrevrangebyscoreResult = await connection.executeQuery('ZREVRANGEBYSCORE test:zset 3 1');
      expect(zrevrangebyscoreResult[0].rows).toEqual([{ result: 'three' }, { result: 'two' }, { result: 'one' }]);
    });

    it('should execute ZREMRANGEBYRANK command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "one" 2 "two" 3 "three" 4 "four"');

      const zremrangebyrankResult = await connection.executeQuery('ZREMRANGEBYRANK test:zset 1 2');
      expect(zremrangebyrankResult[0].rows[0].result).toBe(2);

      const zrangeResult = await connection.executeQuery('ZRANGE test:zset 0 -1');
      expect(zrangeResult[0].rows).toEqual([{ result: 'one' }, { result: 'four' }]);
    });

    it('should execute ZREMRANGEBYSCORE command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "one" 2 "two" 3 "three" 4 "four"');

      const zremrangebyscoreResult = await connection.executeQuery('ZREMRANGEBYSCORE test:zset 2 3');
      expect(zremrangebyscoreResult[0].rows[0].result).toBe(2);

      const zrangeResult = await connection.executeQuery('ZRANGE test:zset 0 -1');
      expect(zrangeResult[0].rows).toEqual([{ result: 'one' }, { result: 'four' }]);
    });

    it('should execute ZPOPMAX command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "one" 2 "two" 3 "three"');

      const zpopmaxResult = await connection.executeQuery('ZPOPMAX test:zset');
      expect(zpopmaxResult[0].rows).toEqual([
        { field: 'value', value: 'three' },
        { field: 'score', value: 3 }
      ]);
    });

    it('should execute ZPOPMIN command', async () => {
      await connection.executeQuery('ZADD test:zset 1 "one" 2 "two" 3 "three"');

      const zpopminResult = await connection.executeQuery('ZPOPMIN test:zset');
      expect(zpopminResult[0].rows).toEqual([
        { field: 'value', value: 'one' },
        { field: 'score', value: 1 }
      ]);
    });
  });

  describe('Redis Additional Commands - Generic Key Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should execute DUMP command', async () => {
      await connection.executeQuery('SET test:dump "hello world"');

      const dumpResult = await connection.executeQuery('DUMP test:dump');
      const dumpData = dumpResult[0].rows[0].result;
      expect(dumpData).toBeDefined();
      expect(typeof dumpData).toBe('string');
      expect(dumpData.length).toBeGreaterThan(0);
    });

    it('should execute SORT command', async () => {
      await connection.executeQuery('LPUSH test:numbers "3" "1" "2"');

      const sortResult = await connection.executeQuery('SORT test:numbers');
      expect(sortResult[0].rows).toEqual([{ result: '1' }, { result: '2' }, { result: '3' }]);
    });

    it('should execute TOUCH command', async () => {
      await connection.executeQuery('SET test:touch "value"');

      const touchResult = await connection.executeQuery('TOUCH test:touch test:nonexistent');
      expect(touchResult[0].rows[0].result).toBe(1);
    });

    it('should execute UNLINK command', async () => {
      await connection.executeQuery('SET test:unlink "value"');

      const unlinkResult = await connection.executeQuery('UNLINK test:unlink');
      expect(unlinkResult[0].rows[0].result).toBe(1);

      const getResult = await connection.executeQuery('GET test:unlink');
      expect(getResult[0].rows).toEqual([{ result: null }]);
    });

    it('should execute PEXPIRE and PTTL commands', async () => {
      await connection.executeQuery('SET test:pexpire "value"');

      const pexpireResult = await connection.executeQuery('PEXPIRE test:pexpire 10000');
      expect(pexpireResult[0].rows[0].result).toBe(1);

      const pttlResult = await connection.executeQuery('PTTL test:pexpire');
      expect(pttlResult[0].rows[0].result).toBeGreaterThan(0);
      expect(pttlResult[0].rows[0].result).toBeLessThanOrEqual(10000);
    });

    it('should execute EXPIREAT command', async () => {
      await connection.executeQuery('SET test:expireat "value"');

      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const expireatResult = await connection.executeQuery(`EXPIREAT test:expireat ${futureTimestamp}`);
      expect(expireatResult[0].rows[0].result).toBe(1);

      const ttlResult = await connection.executeQuery('TTL test:expireat');
      expect(ttlResult[0].rows[0].result).toBeGreaterThan(0);
    });
  });

  describe('Client Metadata Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should get database version', async () => {
      const version = await connection.versionString();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version).not.toBe('Unknown');
    });

    it('should list databases', async () => {
      const databases = await connection.listDatabases();
      expect(databases).toBeDefined();
      expect(Array.isArray(databases)).toBe(true);
      expect(databases.length).toBeGreaterThanOrEqual(1);
      expect(databases).toContain('0'); // Database 0 should always exist
    });

    it('should list tables (keys and info views)', async () => {
      const tables = await connection.listTables();
      expect(tables).toBeDefined();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBe(1);
      expect(tables[0]).toMatchObject({
        name: 'keys',
        entityType: 'table',
        schema: null
      });
    });

    it('should list views (info view)', async () => {
      const views = await connection.listViews();
      expect(views).toBeDefined();
      expect(Array.isArray(views)).toBe(true);
      expect(views.length).toBe(1);
      expect(views[0]).toMatchObject({
        name: 'info',
        entityType: 'view',
        schema: null
      });
    });

    it('should list table columns for keys table', async () => {
      const columns = await connection.listTableColumns('keys');
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBe(6);

      const columnNames = columns.map(c => c.columnName);
      expect(columnNames).toContain('key');
      expect(columnNames).toContain('value');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('encoding');
      expect(columnNames).toContain('ttl');
      expect(columnNames).toContain('memory');
    });

    it('should list table columns for info view', async () => {
      const columns = await connection.listTableColumns('info');
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);

      const columnNames = columns.map(c => c.columnName);
      expect(columnNames).toContain('redis_version');
    });

    it('should get primary keys for keys table', async () => {
      const primaryKeys = await connection.getPrimaryKeys('keys');
      expect(primaryKeys).toBeDefined();
      expect(Array.isArray(primaryKeys)).toBe(true);
      expect(primaryKeys.length).toBe(1);
      expect(primaryKeys[0]).toMatchObject({ columnName: 'key' });
    });

    it('should return empty arrays for unsupported metadata', async () => {
      // Redis doesn't support these features
      expect(await connection.listSchemas()).toEqual([]);
      expect(await connection.listRoutines()).toEqual([]);
      expect(await connection.listTableIndexes()).toEqual([]);
      expect(await connection.listTableTriggers()).toEqual([]);
      expect(await connection.getTableKeys()).toEqual([]);
      expect(await connection.getTableReferences()).toEqual([]);
    });

    it('should return supported features correctly', async () => {
      const features = await connection.supportedFeatures();
      expect(features).toMatchObject({
        customRoutines: false,
        comments: false,
        properties: true,
        partitions: false,
        editPartitions: false,
        backups: false,
        backDirFormat: false,
        restore: false,
        indexNullsNotDistinct: false,
        transactions: true
      });
    });
  });

  describe('Data Retrieval Operations', () => {
    beforeEach(async () => {
      await connection.executeQuery('FLUSHDB');
      // Set up test data
      await connection.executeQuery('SET test:string:1 "value1"');
      await connection.executeQuery('SET test:string:2 "value2"');
      await connection.executeQuery('SET test:string:3 "value3"');
      await connection.executeQuery('LPUSH test:list "item1" "item2"');
      await connection.executeQuery('HSET test:hash field1 "value1" field2 "value2"');
    });

    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should select top from keys table', async () => {
      const result = await connection.selectTop('keys', 0, 10, [], []);

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result.length).toBeGreaterThan(0);
      expect(result.fields).toBeDefined();

      // Check that results have the expected structure
      const firstRow = result.result[0];
      expect(firstRow).toHaveProperty('key');
      expect(firstRow).toHaveProperty('value');
      expect(firstRow).toHaveProperty('type');
      expect(firstRow).toHaveProperty('ttl');
      expect(firstRow).toHaveProperty('memory');
      expect(firstRow).toHaveProperty('encoding');
    });

    it('should filter keys by pattern', async () => {
      const result = await connection.selectTop('keys', 0, 10, [], [
        { field: 'key', type: '=', value: 'test:string:*' }
      ]);

      expect(result.result.length).toBe(3);
      result.result.forEach((row: any) => {
        expect(row.key).toMatch(/^test:string:/);
      });
    });

    it('should handle pagination correctly', async () => {
      const page1 = await connection.selectTop('keys', 0, 2, [], []);
      const page2 = await connection.selectTop('keys', 2, 2, [], []);

      expect(page1.result.length).toBeLessThanOrEqual(2);
      expect(page2.result.length).toBeLessThanOrEqual(2);

      // Keys should be different
      const page1Keys = page1.result.map((r: any) => r.key);
      const page2Keys = page2.result.map((r: any) => r.key);

      page2Keys.forEach((key: string) => {
        expect(page1Keys).not.toContain(key);
      });
    });

    it('should retrieve different data types correctly', async () => {
      // Create a zset for testing
      await connection.executeQuery('ZADD test:zset 1 "member1" 2 "member2"');

      const result = await connection.selectTop('keys', 0, 100, [], []);

      const stringKey = result.result.find((r: any) => r.key === 'test:string:1');
      expect(stringKey).toBeDefined();
      expect(stringKey.type).toBe('string');
      expect(stringKey.value).toBe('value1');

      const listKey = result.result.find((r: any) => r.key === 'test:list');
      expect(listKey).toBeDefined();
      expect(listKey.type).toBe('list');
      expect(Array.isArray(listKey.value)).toBe(true);

      const hashKey = result.result.find((r: any) => r.key === 'test:hash');
      expect(hashKey).toBeDefined();
      expect(hashKey.type).toBe('hash');
      expect(typeof hashKey.value).toBe('object');
      expect(!Array.isArray(hashKey.value)).toBe(true);

      const zsetKey = result.result.find((r: any) => r.key === 'test:zset');
      expect(zsetKey).toBeDefined();
      expect(zsetKey.type).toBe('zset');
      expect(Array.isArray(zsetKey.value)).toBe(true);
      expect(zsetKey.value[0]).toHaveProperty('value');
      expect(zsetKey.value[0]).toHaveProperty('score');
      expect(zsetKey.value[0].value).toBe('member1');
      expect(zsetKey.value[0].score).toBe(1);
    });

    it('should get table length (DBSIZE)', async () => {
      const length = await connection.getTableLength();
      expect(length).toBeDefined();
      expect(typeof length).toBe('number');
      expect(length).toBeGreaterThan(0);
    });

    it('should select from info view', async () => {
      const result = await connection.selectTop('info', 0, 100, [], []);

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.length).toBe(1);

      const info = result.result[0];
      expect(info).toHaveProperty('redis_version');
      expect(info).toHaveProperty('os');
      expect(info).toHaveProperty('tcp_port');
    });

    it('should generate select top query', async () => {
      const query = await connection.getQuerySelectTop('keys', 50);
      expect(query).toBe('SCAN 0 MATCH * COUNT 50');
    });
  });

  describe('Data Modification Operations', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should insert new keys via applyChanges', async () => {
      const changes = {
        inserts: [
          {
            table: 'keys',
            data: [{ key: 'test:new:key' }]
          }
        ],
        updates: [],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('GET test:new:key');
      expect(result[0].rows[0].result).toBe('');
    });

    it('should update key values via applyChanges', async () => {
      await connection.executeQuery('SET test:update "old value"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:update' }],
            column: 'value',
            value: 'new value'
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('GET test:update');
      expect(result[0].rows[0].result).toBe('new value');
    });

    it('should rename keys via applyChanges', async () => {
      await connection.executeQuery('SET test:old:name "value"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:old:name' }],
            column: 'key',
            value: 'test:new:name'
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const oldResult = await connection.executeQuery('GET test:old:name');
      expect(oldResult[0].rows[0].result).toBeNull();

      const newResult = await connection.executeQuery('GET test:new:name');
      expect(newResult[0].rows[0].result).toBe('value');
    });

    it('should update TTL via applyChanges', async () => {
      await connection.executeQuery('SET test:ttl "value"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:ttl' }],
            column: 'ttl',
            value: '300'
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('TTL test:ttl');
      expect(result[0].rows[0].result).toBeGreaterThan(0);
      expect(result[0].rows[0].result).toBeLessThanOrEqual(300);
    });

    it('should remove TTL via applyChanges (PERSIST)', async () => {
      await connection.executeQuery('SETEX test:persist 100 "value"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:persist' }],
            column: 'ttl',
            value: '-1'
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('TTL test:persist');
      expect(result[0].rows[0].result).toBe(-1);
    });

    it('should delete keys via applyChanges', async () => {
      await connection.executeQuery('SET test:delete "value"');

      const changes = {
        inserts: [],
        updates: [],
        deletes: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:delete' }]
          }
        ]
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('GET test:delete');
      expect(result[0].rows[0].result).toBeNull();
    });

    it('should update complex data types (list)', async () => {
      await connection.executeQuery('LPUSH test:list "item1"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:list' }],
            column: 'value',
            value: JSON.stringify(['new1', 'new2', 'new3'])
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('LRANGE test:list 0 -1');
      expect(result[0].rows.map(r => r.result)).toEqual(['new1', 'new2', 'new3']);
    });

    it('should update complex data types (hash)', async () => {
      await connection.executeQuery('HSET test:hash field1 "value1"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:hash' }],
            column: 'value',
            value: JSON.stringify({ newfield1: 'newvalue1', newfield2: 'newvalue2' })
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('HGETALL test:hash');
      expect(result[0].rows).toEqual([
        { field: 'newfield1', value: 'newvalue1' },
        { field: 'newfield2', value: 'newvalue2' }
      ]);
    });

    it('should update complex data types (set)', async () => {
      await connection.executeQuery('SADD test:set "member1"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:set' }],
            column: 'value',
            value: JSON.stringify(['newmember1', 'newmember2'])
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('SMEMBERS test:set');
      const members = result[0].rows.map(r => r.result).sort();
      expect(members).toEqual(['newmember1', 'newmember2']);
    });

    it('should update complex data types (sorted set)', async () => {
      await connection.executeQuery('ZADD test:zset 1 "member1"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:zset' }],
            column: 'value',
            value: JSON.stringify([
              { value: 'newmember1', score: 1 },
              { value: 'newmember2', score: 2 }
            ])
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('ZRANGE test:zset 0 -1');
      expect(result[0].rows.map(r => r.result)).toEqual(['newmember1', 'newmember2']);
    });

    it('should truncate all keys (FLUSHDB)', async () => {
      await connection.executeQuery('SET key1 "value1"');
      await connection.executeQuery('SET key2 "value2"');

      await connection.truncateAllTables();

      const size = await connection.getTableLength();
      expect(size).toBe(0);
    });

    it('should handle multiple changes in one transaction', async () => {
      await connection.executeQuery('SET test:key1 "value1"');
      await connection.executeQuery('SET test:key2 "value2"');

      const changes = {
        inserts: [
          { table: 'keys', data: [{ key: 'test:key3' }] }
        ],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:key1' }],
            column: 'value',
            value: 'updated1'
          }
        ],
        deletes: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:key2' }]
          }
        ]
      };

      await connection.applyChanges(changes);

      const key1 = await connection.executeQuery('GET test:key1');
      expect(key1[0].rows[0].result).toBe('updated1');

      const key2 = await connection.executeQuery('GET test:key2');
      expect(key2[0].rows[0].result).toBeNull();

      const key3 = await connection.executeQuery('GET test:key3');
      expect(key3[0].rows[0].result).toBe('');
    });
  });

  describe('Error Handling', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should handle invalid commands gracefully', async () => {
      const result = await connection.executeQuery('INVALIDCOMMAND arg1 arg2');
      expect(result).toBeDefined();
      expect(result[0].rows).toBeDefined();
      expect(result[0].rows[0]).toHaveProperty('error');
    });

    it('should handle syntax errors gracefully', async () => {
      const result = await connection.executeQuery('SET key');
      expect(result).toBeDefined();
      expect(result[0].rows).toBeDefined();
      expect(result[0].rows[0]).toHaveProperty('error');
    });

    it('should handle operations on wrong data types', async () => {
      await connection.executeQuery('SET test:wrongtype "string"');

      const result = await connection.executeQuery('LPUSH test:wrongtype "item"');
      expect(result).toBeDefined();
      expect(result[0].rows[0]).toHaveProperty('error');
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      expect(connection).toBeDefined();
      // If we got here, connection already succeeded in beforeAll
    });

    it('should reconnect after disconnect', async () => {
      await connection.disconnect();
      await connection.connect();

      const result = await connection.executeQuery('PING');
      expect(result[0].rows[0].result).toBe('PONG');
    });
  });

  describe('Comment Handling', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should ignore comment lines', async () => {
      const commands = `
        # This is a comment
        SET test:key1 "value1"
        # Another comment
        SET test:key2 "value2"
      `;

      const results = await connection.executeQuery(commands);
      expect(results.length).toBe(2); // Only 2 SET commands executed
    });
  });

  describe('Read-Only Mode', () => {
    let readOnlyConnection: BasicDatabaseClient<any>;

    beforeAll(async () => {
      const readOnlyConfig = { ...config };
      readOnlyConfig.readOnlyMode = true;
      const server = createServer(readOnlyConfig);
      readOnlyConnection = server.createConnection('0');
      await readOnlyConnection.connect();
    });

    afterAll(async () => {
      if (readOnlyConnection) {
        await readOnlyConnection.disconnect();
      }
    });

    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should allow read-only commands', async () => {
      await connection.executeQuery('SET test:readonly "value"');

      const result = await readOnlyConnection.executeQuery('GET test:readonly');
      expect(result[0].rows[0].result).toBe('value');
    });

    it('should block SET command in read-only mode', async () => {
      const result = await readOnlyConnection.executeQuery('SET test:blocked "value"');
      expect(result[0].rows[0]).toHaveProperty('error');
      expect(result[0].rows[0].error).toContain('not allowed in Read-Only mode');
    });

    it('should block DEL command in read-only mode', async () => {
      await connection.executeQuery('SET test:delete "value"');

      const result = await readOnlyConnection.executeQuery('DEL test:delete');
      expect(result[0].rows[0]).toHaveProperty('error');
      expect(result[0].rows[0].error).toContain('not allowed in Read-Only mode');
    });

    it('should block LPUSH command in read-only mode', async () => {
      const result = await readOnlyConnection.executeQuery('LPUSH test:list "item"');
      expect(result[0].rows[0]).toHaveProperty('error');
      expect(result[0].rows[0].error).toContain('not allowed in Read-Only mode');
    });

    it('should block HSET command in read-only mode', async () => {
      const result = await readOnlyConnection.executeQuery('HSET test:hash field "value"');
      expect(result[0].rows[0]).toHaveProperty('error');
      expect(result[0].rows[0].error).toContain('not allowed in Read-Only mode');
    });

    it('should block SADD command in read-only mode', async () => {
      const result = await readOnlyConnection.executeQuery('SADD test:set "member"');
      expect(result[0].rows[0]).toHaveProperty('error');
      expect(result[0].rows[0].error).toContain('not allowed in Read-Only mode');
    });

    it('should block ZADD command in read-only mode', async () => {
      const result = await readOnlyConnection.executeQuery('ZADD test:zset 1 "member"');
      expect(result[0].rows[0]).toHaveProperty('error');
      expect(result[0].rows[0].error).toContain('not allowed in Read-Only mode');
    });

    it('should block FLUSHDB command in read-only mode', async () => {
      const result = await readOnlyConnection.executeQuery('FLUSHDB');
      expect(result[0].rows[0]).toHaveProperty('error');
      expect(result[0].rows[0].error).toContain('not allowed in Read-Only mode');
    });

    it('should allow SCAN command in read-only mode', async () => {
      await connection.executeQuery('SET test:scan1 "value1"');
      await connection.executeQuery('SET test:scan2 "value2"');

      const result = await readOnlyConnection.executeQuery('SCAN 0');
      expect(result[0].rows).toBeDefined();
      expect(result[0].rows.length).toBeGreaterThan(0);
    });

    it('should allow INFO command in read-only mode', async () => {
      const result = await readOnlyConnection.executeQuery('INFO');
      expect(result[0].rows).toBeDefined();
      expect(result[0].fields).toBeDefined();
    });
  });

  describe('Scanning with TYPE Filter', () => {
    beforeEach(async () => {
      await connection.executeQuery('FLUSHDB');
      // Create keys of different types
      await connection.executeQuery('SET test:string:1 "value1"');
      await connection.executeQuery('SET test:string:2 "value2"');
      await connection.executeQuery('LPUSH test:list:1 "item1"');
      await connection.executeQuery('LPUSH test:list:2 "item2"');
      await connection.executeQuery('HSET test:hash:1 field "value"');
      await connection.executeQuery('SADD test:set:1 "member"');
      await connection.executeQuery('ZADD test:zset:1 1 "member"');
    });

    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should filter keys by string type', async () => {
      const result = await connection.executeQuery('SCAN 0 TYPE string');
      const keys = result[0].rows.map(r => r.value);

      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((key: string) => {
        if (key && key !== '0') { // Skip cursor
          expect(key).toMatch(/test:string:/);
        }
      });
    });

    it('should filter keys by list type', async () => {
      const result = await connection.executeQuery('SCAN 0 TYPE list');
      const keys = result[0].rows.map(r => r.value).filter((k: string) => k !== '0');

      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((key: string) => {
        expect(key).toMatch(/test:list:/);
      });
    });

    it('should filter keys by hash type', async () => {
      const result = await connection.executeQuery('SCAN 0 TYPE hash');
      const keys = result[0].rows.map(r => r.value).filter((k: string) => k !== '0');

      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((key: string) => {
        expect(key).toMatch(/test:hash:/);
      });
    });

    it('should use selectTop with TYPE filter in pattern', async () => {
      // Set up additional string keys
      const result = await connection.selectTop('keys', 0, 100, [], [
        { field: 'key', type: '=', value: 'test:string:*' }
      ]);

      expect(result.result.length).toBe(2);
      result.result.forEach((row: any) => {
        expect(row.type).toBe('string');
        expect(row.key).toMatch(/test:string:/);
      });
    });
  });

  describe('Stream Data Type via applyChanges', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should update stream values via applyChanges', async () => {
      // Create initial stream
      await connection.executeQuery('XADD test:stream * field1 value1 field2 value2');

      const streamData = [
        { id: '*', message: { newfield1: 'newvalue1', newfield2: 'newvalue2' } },
        { id: '*', message: { newfield3: 'newvalue3' } }
      ];

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:stream' }],
            column: 'value',
            value: JSON.stringify(streamData)
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('XLEN test:stream');
      expect(result[0].rows[0].result).toBe(2);

      const rangeResult = await connection.executeQuery('XRANGE test:stream - +');
      expect(rangeResult[0].rows.length).toBe(2);
    });

    it('should retrieve stream data correctly from selectTop', async () => {
      await connection.executeQuery('XADD test:stream:1 * field1 value1');
      await connection.executeQuery('XADD test:stream:1 * field2 value2');

      const result = await connection.selectTop('keys', 0, 100, [], [
        { field: 'key', type: '=', value: 'test:stream:*' }
      ]);

      const streamKey = result.result.find((r: any) => r.key === 'test:stream:1');
      expect(streamKey).toBeDefined();
      expect(streamKey.type).toBe('stream');
      expect(Array.isArray(streamKey.value)).toBe(true);
      expect(streamKey.value.length).toBe(2);
      expect(streamKey.value[0]).toHaveProperty('id');
      expect(streamKey.value[0]).toHaveProperty('message');
    });

    it('should create new stream via applyChanges', async () => {
      const streamData = [
        { id: '*', message: { field1: 'value1' } }
      ];

      const changes = {
        inserts: [
          { table: 'keys', data: [{ key: 'test:newstream' }] }
        ],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:newstream' }],
            column: 'value',
            value: JSON.stringify(streamData)
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const typeResult = await connection.executeQuery('TYPE test:newstream');
      expect(typeResult[0].rows[0].result).toBe('stream');

      const lenResult = await connection.executeQuery('XLEN test:newstream');
      expect(lenResult[0].rows[0].result).toBe(1);
    });
  });

  describe('Empty Value Edge Cases', () => {
    afterEach(async () => {
      await connection.executeQuery('FLUSHDB');
    });

    it('should handle empty list updates', async () => {
      await connection.executeQuery('LPUSH test:list "item1" "item2"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:list' }],
            column: 'value',
            value: JSON.stringify([])
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const existsResult = await connection.executeQuery('EXISTS test:list');
      expect(existsResult[0].rows[0].result).toBe(0); // Key should be deleted when empty
    });

    it('should handle empty set updates', async () => {
      await connection.executeQuery('SADD test:set "member1" "member2"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:set' }],
            column: 'value',
            value: JSON.stringify([])
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const existsResult = await connection.executeQuery('EXISTS test:set');
      expect(existsResult[0].rows[0].result).toBe(0); // Key should be deleted when empty
    });

    it('should handle empty hash updates', async () => {
      await connection.executeQuery('HSET test:hash field1 "value1" field2 "value2"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:hash' }],
            column: 'value',
            value: JSON.stringify({})
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const existsResult = await connection.executeQuery('EXISTS test:hash');
      expect(existsResult[0].rows[0].result).toBe(0); // Key should be deleted when empty
    });

    it('should handle empty string updates', async () => {
      await connection.executeQuery('SET test:string "value"');

      const changes = {
        inserts: [],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:string' }],
            column: 'value',
            value: ''
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('GET test:string');
      expect(result[0].rows[0].result).toBe('');
    });

    it('should handle list with empty string values', async () => {
      const changes = {
        inserts: [
          { table: 'keys', data: [{ key: 'test:emptystrings' }] }
        ],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:emptystrings' }],
            column: 'value',
            value: JSON.stringify(['', 'value', ''])
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('LRANGE test:emptystrings 0 -1');
      expect(result[0].rows.map(r => r.result)).toEqual(['', 'value', '']);
    });

    it('should handle hash with empty string values', async () => {
      const changes = {
        inserts: [
          { table: 'keys', data: [{ key: 'test:emptyhash' }] }
        ],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:emptyhash' }],
            column: 'value',
            value: JSON.stringify({ field1: '', field2: 'value', field3: '' })
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('HGETALL test:emptyhash');
      expect(result[0].rows).toEqual([
        { field: 'field1', value: '' },
        { field: 'field2', value: 'value' },
        { field: 'field3', value: '' }
      ]);
    });

    it('should handle inserting key with no value (empty string)', async () => {
      const changes = {
        inserts: [
          { table: 'keys', data: [{ key: 'test:emptyinsert' }] }
        ],
        updates: [],
        deletes: []
      };

      await connection.applyChanges(changes);

      const existsResult = await connection.executeQuery('EXISTS test:emptyinsert');
      expect(existsResult[0].rows[0].result).toBe(1);

      const getResult = await connection.executeQuery('GET test:emptyinsert');
      expect(getResult[0].rows[0].result).toBe('');
    });

    it('should handle zset with zero scores', async () => {
      const zsetData = [
        { value: 'member1', score: 0 },
        { value: 'member2', score: 0 },
        { value: 'member3', score: 1 }
      ];

      const changes = {
        inserts: [
          { table: 'keys', data: [{ key: 'test:zeroscores' }] }
        ],
        updates: [
          {
            table: 'keys',
            primaryKeys: [{ column: 'key', value: 'test:zeroscores' }],
            column: 'value',
            value: JSON.stringify(zsetData)
          }
        ],
        deletes: []
      };

      await connection.applyChanges(changes);

      const result = await connection.executeQuery('ZRANGE test:zeroscores 0 -1 WITHSCORES');
      // node-redis transforms WITHSCORES into objects with value and score properties
      expect(result[0].rows.length).toBe(3); // 3 members as objects
      expect(result[0].rows[0]).toEqual({ value: 'member1', score: 0 });
      expect(result[0].rows[1]).toEqual({ value: 'member2', score: 0 });
      expect(result[0].rows[2]).toEqual({ value: 'member3', score: 1 });

      // Check that zero scores are preserved
      const scoreResults = await connection.executeQuery('ZSCORE test:zeroscores member1');
      expect(Number(scoreResults[0].rows[0].result)).toBe(0);
    });

    it('should handle string values that look like JSON', async () => {
      // To store the literal string "[1,2,3]", you need to double-stringify
      const changes = {
        inserts: [{ table: 'keys', data: [{ key: 'test:jsonstring' }] }],
        updates: [{
          table: 'keys',
          primaryKeys: [{ column: 'key', value: 'test:jsonstring' }],
          column: 'value',
          value: JSON.stringify("[1,2,3]") // Double-stringified: "\"[1,2,3]\""
        }],
        deletes: []
      };

      await connection.applyChanges(changes);

      // Verify it's a string, not a list
      const typeResult = await connection.executeQuery('TYPE test:jsonstring');
      expect(typeResult[0].rows[0].result).toBe('string');

      const valueResult = await connection.executeQuery('GET test:jsonstring');
      expect(valueResult[0].rows[0].result).toBe('[1,2,3]');
    });
  });
});
