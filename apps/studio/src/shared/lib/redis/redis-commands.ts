/**
 * Redis Commands and Options - Centralized definitions
 * 
 * Used by both CodeMirror 5 vendor files and CodeMirror 6 UI-kit implementation
 */

// Redis commands with their descriptions, organized by category
export const REDIS_COMMANDS = {
  // String commands
  GET: "Get the value of a key",
  SET: "Set the string value of a key", 
  MGET: "Get the values of multiple keys",
  MSET: "Set multiple keys to multiple values",
  INCR: "Increment the integer value of a key by one",
  DECR: "Decrement the integer value of a key by one",
  INCRBY: "Increment the integer value of a key by the given amount",
  DECRBY: "Decrement the integer value of a key by the given number",
  INCRBYFLOAT: "Increment the float value of a key by the given amount",
  APPEND: "Append a value to a key",
  STRLEN: "Get the length of the value stored in a key",
  GETRANGE: "Get a substring of the string stored at a key",
  SETRANGE: "Overwrite part of a string at key starting at the specified offset",
  GETBIT: "Returns the bit value at offset in the string value stored at key",
  SETBIT: "Sets or clears the bit at offset in the string value stored at key",

  // Hash commands
  HGET: "Get the value of a hash field",
  HSET: "Set the string value of a hash field",
  HMGET: "Get the values of multiple hash fields", 
  HMSET: "Set multiple hash fields to multiple values",
  HGETALL: "Get all the fields and values in a hash",
  HKEYS: "Get all the fields in a hash",
  HVALS: "Get all the values in a hash",
  HLEN: "Get the number of fields in a hash",
  HEXISTS: "Determine if a hash field exists",
  HDEL: "Delete one or more hash fields",
  HINCRBY: "Increment the integer value of a hash field by the given number",
  HINCRBYFLOAT: "Increment the float value of a hash field by the given amount",
  HSETNX: "Set the value of a hash field, only if the field does not exist",

  // List commands
  LPUSH: "Prepend one or multiple values to a list",
  RPUSH: "Append one or multiple values to a list",
  LPOP: "Remove and return the first element of a list",
  RPOP: "Remove and return the last element of a list",
  LLEN: "Get the length of a list",
  LRANGE: "Get a range of elements from a list",
  LINDEX: "Get an element from a list by its index",
  LSET: "Set the value of an element in a list by its index",
  LREM: "Remove elements from a list",
  LTRIM: "Trim a list to the specified range",
  BLPOP: "Remove and get the first element in a list, or block until one is available",
  BRPOP: "Remove and get the last element in a list, or block until one is available",
  LINSERT: "Insert an element before or after another element in a list",
  LPUSHX: "Prepend a value to a list, only if the list exists",
  RPUSHX: "Append a value to a list, only if the list exists",

  // Set commands
  SADD: "Add one or more members to a set",
  SMEMBERS: "Get all the members in a set",
  SREM: "Remove one or more members from a set",
  SCARD: "Get the number of members in a set",
  SISMEMBER: "Determine if a given value is a member of a set",
  SPOP: "Remove and return one or multiple random members from a set",
  SRANDMEMBER: "Get one or multiple random members from a set",
  SINTER: "Intersect multiple sets",
  SUNION: "Add multiple sets",
  SDIFF: "Subtract multiple sets",
  SINTERSTORE: "Intersect multiple sets and store the resulting set",
  SUNIONSTORE: "Add multiple sets and store the resulting set",
  SDIFFSTORE: "Subtract multiple sets and store the resulting set",

  // Sorted set commands
  ZADD: "Add one or more members to a sorted set, or update its score if it already exists",
  ZRANGE: "Return a range of members in a sorted set, by index",
  ZRANGEBYSCORE: "Return a range of members in a sorted set, by score",
  ZREM: "Remove one or more members from a sorted set",
  ZCARD: "Get the number of members in a sorted set",
  ZSCORE: "Get the score associated with the given member in a sorted set",
  ZRANK: "Determine the index of a member in a sorted set",
  ZREVRANK: "Determine the index of a member in a sorted set, with scores ordered from high to low",
  ZREVRANGE: "Return a range of members in a sorted set, by index, with scores ordered from high to low",
  ZINCRBY: "Increment the score of a member in a sorted set",
  ZCOUNT: "Count the members in a sorted set with scores within the given values",
  ZREMRANGEBYRANK: "Remove all members in a sorted set within the given indexes",
  ZREMRANGEBYSCORE: "Remove all members in a sorted set within the given scores",
  ZUNIONSTORE: "Add multiple sorted sets and store the resulting sorted set",
  ZINTERSTORE: "Intersect multiple sorted sets and store the resulting sorted set",

  // Generic commands
  DEL: "Delete a key",
  EXISTS: "Determine if a key exists",
  EXPIRE: "Set a key's time to live in seconds",
  EXPIREAT: "Set the expiration for a key as a UNIX timestamp",
  TTL: "Get the time to live for a key",
  PERSIST: "Remove the expiration from a key",
  KEYS: "Find all keys matching the given pattern",
  SCAN: "Incrementally iterate the keys space",
  TYPE: "Determine the type stored at key",
  RENAME: "Rename a key",
  RENAMENX: "Rename a key, only if the new key does not exist",
  DUMP: "Return a serialized version of the value stored at the specified key",
  RESTORE: "Create a key using the provided serialized value",
  MOVE: "Move a key to another database",

  // Connection commands
  AUTH: "Authenticate to the server",
  PING: "Ping the server",
  ECHO: "Echo the given string",
  SELECT: "Change the selected database for the current connection",
  QUIT: "Close the connection",
  SWAPDB: "Swaps two Redis databases",

  // Server commands
  FLUSHDB: "Remove all keys from the current database",
  FLUSHALL: "Remove all keys from all databases",
  DBSIZE: "Return the number of keys in the selected database",
  INFO: "Get information and statistics about the server",
  CONFIG: "Get or set configuration parameters",
  TIME: "Return the current server time",
  LASTSAVE: "Get the UNIX time stamp of the last successful save to disk",
  SAVE: "Synchronously save the dataset to disk",
  BGSAVE: "Asynchronously save the dataset to disk",
  BGREWRITEAOF: "Asynchronously rewrite the append-only file",
  SHUTDOWN: "Synchronously save the dataset to disk and then shut down the server",

  // Transaction commands
  MULTI: "Mark the start of a transaction block",
  EXEC: "Execute all commands issued after MULTI",
  DISCARD: "Discard all commands issued after MULTI",
  WATCH: "Watch the given keys to determine execution of the MULTI/EXEC block",
  UNWATCH: "Forget about all watched keys",

  // Pub/Sub commands
  PUBLISH: "Post a message to a channel",
  SUBSCRIBE: "Subscribe to channels",
  UNSUBSCRIBE: "Unsubscribe from channels",
  PSUBSCRIBE: "Subscribe to channels matching patterns",
  PUNSUBSCRIBE: "Unsubscribe from channels matching patterns",
  PUBSUB: "Inspect the state of the Pub/Sub subsystem",

  // JSON commands (Redis JSON module)
  "JSON.SET": "Set JSON value at path",
  "JSON.GET": "Get JSON value at path", 
  "JSON.DEL": "Delete JSON value at path",
  "JSON.TYPE": "Get type of JSON value at path",
  "JSON.NUMINCRBY": "Increment number in JSON document",
  "JSON.NUMMULTBY": "Multiply number in JSON document",
  "JSON.ARRAPPEND": "Append to JSON array",
  "JSON.ARRLEN": "Return length of JSON array",
  "JSON.ARRPOP": "Remove and return element from JSON array",
} as const;

// Command options/modifiers with descriptions
export const REDIS_OPTIONS = {
  EX: "Set expiration in seconds",
  PX: "Set expiration in milliseconds", 
  EXAT: "Set expiration as Unix timestamp in seconds",
  PXAT: "Set expiration as Unix timestamp in milliseconds",
  KEEPTTL: "Retain the time to live associated with the key",
  NX: "Only set if key does not exist / Only add new elements",
  XX: "Only set if key already exists / Only update existing elements",
  GT: "Only set expiry when new expiry is greater / Only update if new score is greater",
  LT: "Only set expiry when new expiry is less / Only update if new score is lesser",
  CH: "Modify return value to return number of changed elements",
  INCR: "Act like ZINCRBY, increment the score instead of setting it",
  BYSCORE: "Return elements by score range instead of index",
  BYLEX: "Return elements by lexicographic range",
  REV: "Reverse the result, from highest to lowest",
  LIMIT: "Limit the results with offset and count",
  WITHSCORES: "Include scores in the result",
  ASYNC: "Async flush mode",
  SYNC: "Sync flush mode",
  BEFORE: "Insert before the pivot element",
  AFTER: "Insert after the pivot element",
  COUNT: "Limit the number of replies",
  MATCH: "Filter by pattern",
  TYPE: "Filter by type",
} as const;

// Helper functions to get command/option names and descriptions
export const getCommandNames = () => Object.keys(REDIS_COMMANDS);
export const getOptionNames = () => Object.keys(REDIS_OPTIONS);
export const getCommandDescription = (cmd: string) => REDIS_COMMANDS[cmd as keyof typeof REDIS_COMMANDS];
export const getOptionDescription = (opt: string) => REDIS_OPTIONS[opt as keyof typeof REDIS_OPTIONS];