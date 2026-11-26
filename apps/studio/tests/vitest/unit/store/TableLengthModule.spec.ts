import { beforeEach, describe, expect, it } from 'vitest';
import store from '@/store';
import { tableLengthKey } from '@/store/modules/TableLengthModule';

describe('TableLengthModule', () => {
  const usersTable = { name: 'users', schema: 'public', entityType: 'table' };
  const usersView = { name: 'users', schema: 'public', entityType: 'view' };

  beforeEach(async () => {
    store.commit('clearConnection');
    store.commit('database', 'app_db');
    store.commit('namespace', null);
    await store.dispatch('tableLengths/clear');
  });

  it('builds distinct keys across database, namespace, schema, entityType, and table', () => {
    const k1 = tableLengthKey(usersTable, 'db1', null);
    const k2 = tableLengthKey(usersTable, 'db2', null);
    const k3 = tableLengthKey(usersView, 'db1', null);
    const k4 = tableLengthKey({ name: 'a::b', schema: 'c' }, 'db1', null);
    const k5 = tableLengthKey({ name: 'b', schema: 'c::a' }, 'db1', null);

    expect(k1).not.toBeNull();
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k4).not.toBe(k5);
    expect(tableLengthKey(null, 'db1', null)).toBeNull();
  });

  it('stores, reads, and invalidates table row counts', async () => {
    expect(store.getters['tableLengths/getEntry'](usersTable)).toBeNull();

    await store.dispatch('tableLengths/setCount', { table: usersTable, count: 420 });
    const entry = store.getters['tableLengths/getEntry'](usersTable);
    expect(entry?.count).toBe(420);
    expect(typeof entry?.fetchedAt).toBe('number');
    expect(store.getters['tableLengths/getEntry'](usersView)).toBeNull();

    await store.dispatch('tableLengths/invalidate', usersTable);
    expect(store.getters['tableLengths/getEntry'](usersTable)).toBeNull();
  });

  it('clears cached counts on clearConnection', async () => {
    await store.dispatch('tableLengths/setCount', { table: usersTable, count: 99 });
    expect(store.getters['tableLengths/getEntry'](usersTable)?.count).toBe(99);

    store.commit('clearConnection');
    expect(store.getters['tableLengths/getEntry'](usersTable)).toBeNull();
  });
});
