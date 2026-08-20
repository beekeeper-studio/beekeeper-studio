import { RedisClient } from "./redis";

/**
 * Valkey is a fork of Redis 7.2 and speaks the same RESP protocol with the same
 * command set, so the Redis client works against it unchanged. This subclass
 * exists so Valkey is an explicit connection type in the UI, and so any
 * Valkey-only behaviour has somewhere to live as the two projects diverge.
 */
export class ValkeyClient extends RedisClient {

}
