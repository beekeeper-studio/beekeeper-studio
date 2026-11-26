import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import { describe, expect, it, vi } from 'vitest'
import DropDatabasesModal from '@/components/common/modals/DropDatabasesModal.vue'
import { ConnectionTypes, DatabaseElement } from '@/lib/db/types'
import { getDialectData } from '@shared/lib/dialects'
import { dialectFor } from '@shared/lib/dialects/models'

function mountModal(overrides: Record<string, any> = {}) {
  const localVue = createLocalVue()
  localVue.use(Vuex)
  const session = { id: 'connection-1' }
  const connection = {
    dropElement: vi.fn().mockResolvedValue(undefined),
    listDatabases: vi.fn().mockResolvedValue(['current'])
  }
  const state = {
    connection,
    connectionType: 'mysql',
    database: 'current',
    connected: true,
    usedConfig: session,
    databaseList: ['current', 'app'],
    ...overrides.state
  }
  const store = new Vuex.Store({
    state,
    mutations: {
      databaseList: vi.fn((vuexState, names) => { vuexState.databaseList = names })
    }
  })
  const mocks = {
    $confirm: vi.fn().mockResolvedValue(true),
    $modal: { show: vi.fn(), hide: vi.fn() },
    $noty: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    registerHandlers: vi.fn(),
    unregisterHandlers: vi.fn(),
    ...overrides.mocks
  }
  const wrapper = shallowMount(DropDatabasesModal as any, { localVue, store, mocks })
  return { wrapper, store, connection, mocks }
}

describe('DropDatabasesModal', () => {
  it('declares drop capability for supported connection types', () => {
    const supportedTypes = [
      'mysql', 'mariadb', 'tidb', 'starrocks', 'postgresql', 'cockroachdb',
      'greengage', 'sqlserver', 'redshift', 'clickhouse', 'snowflake'
    ]
    const connectionTypeValues = ConnectionTypes.map(({ value }) => value)

    for (const connectionType of supportedTypes) {
      expect(connectionTypeValues, connectionType).toContain(connectionType)
      const dialect = dialectFor(connectionType)
      expect(dialect && getDialectData(dialect).supportsDropDatabase, connectionType).toBe(true)
    }
  })

  it('excludes protected databases for each supported connection type', () => {
    const protectedNames: Record<string, string[]> = {
      mysql: ['mysql', 'information_schema', 'performance_schema', 'sys'],
      mariadb: ['mysql', 'information_schema', 'performance_schema', 'sys'],
      tidb: ['mysql', 'information_schema', 'performance_schema', 'sys'],
      starrocks: ['mysql', 'information_schema', 'performance_schema', 'sys'],
      postgresql: ['template0', 'template1'],
      cockroachdb: ['system'],
      greengage: ['template0', 'template1'],
      sqlserver: ['master', 'model', 'msdb', 'tempdb'],
      redshift: ['dev', 'padb_harvest', 'template0', 'template1', 'sys:internal'],
      clickhouse: ['system', 'information_schema'],
      snowflake: ['snowflake']
    }

    const { wrapper } = mountModal()
    for (const [connectionType, names] of Object.entries(protectedNames)) {
      const rows = (wrapper.vm as any).databaseRows(
        [...names.map(name => name.toUpperCase()), 'app'],
        null,
        connectionType
      )
      expect(rows.map(({ name }) => name), connectionType).toEqual(['app'])
    }
    wrapper.destroy()
  })

  it('excludes the current database and returns before confirming an empty selection', async () => {
    const { wrapper, mocks } = mountModal()
    const vm = wrapper.vm as any
    vm.open()

    expect(vm.databases.map(({ name }) => name)).toEqual(['app'])
    expect(vm.selectedDatabases).toEqual([])
    await vm.drop()
    expect(mocks.$confirm).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('deletes selected databases and closes after refreshing the list', async () => {
    const { wrapper, store, connection, mocks } = mountModal()
    const vm = wrapper.vm as any
    vm.open()
    vm.databases[0].checked = true
    connection.listDatabases.mockResolvedValue(['current'])

    await vm.drop()

    expect(mocks.$confirm).toHaveBeenCalledTimes(1)
    expect(connection.dropElement).toHaveBeenCalledTimes(1)
    expect(connection.dropElement).toHaveBeenCalledWith('app', DatabaseElement.DATABASE)
    expect(store.state.databaseList).toEqual(['current'])
    expect(vm.databases).toEqual([])
    expect(mocks.$modal.hide).toHaveBeenCalledWith('drop-databases')
    wrapper.destroy()
  })

  it('keeps failed databases selected for retry after partial success', async () => {
    const { wrapper, store, connection, mocks } = mountModal({
      state: { databaseList: ['current', 'first', 'second'] }
    })
    const vm = wrapper.vm as any
    vm.open()
    vm.databases.forEach(database => { database.checked = true })
    connection.dropElement
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('permission denied'))
    connection.listDatabases.mockResolvedValue(['current', 'second'])

    await vm.drop()

    expect(connection.dropElement).toHaveBeenCalledTimes(2)
    expect(vm.databases.map(({ name, checked }) => ({ name, checked }))).toEqual([
      { name: 'second', checked: true }
    ])
    expect(vm.error).toContain('second: permission denied')
    expect(mocks.$modal.hide).not.toHaveBeenCalled()

    connection.dropElement.mockResolvedValueOnce(undefined)
    connection.listDatabases.mockResolvedValue(['current'])
    await vm.drop()

    expect(connection.dropElement).toHaveBeenLastCalledWith('second', DatabaseElement.DATABASE)
    expect(store.state.databaseList).toEqual(['current'])
    expect(vm.databases).toEqual([])
    expect(mocks.$modal.hide).toHaveBeenCalledWith('drop-databases')
    wrapper.destroy()
  })

  it('stops further deletions and skips refresh when the connection changes', async () => {
    const { wrapper, store, connection } = mountModal({
      state: { databaseList: ['current', 'first', 'second'] }
    })
    const vm = wrapper.vm as any
    vm.open()
    vm.databases.forEach(database => { database.checked = true })
    connection.dropElement.mockImplementationOnce(async () => {
      store.state.usedConfig = { id: 'connection-2' }
    })

    await vm.drop()

    expect(connection.dropElement).toHaveBeenCalledTimes(1)
    expect(connection.listDatabases).not.toHaveBeenCalled()
    expect(store.state.databaseList).toEqual(['current', 'first', 'second'])
    expect(vm.databases).toEqual([])
    expect(vm.error).toContain('second (connection changed)')
    wrapper.destroy()
  })
})
