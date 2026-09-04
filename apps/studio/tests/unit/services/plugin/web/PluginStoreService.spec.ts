import PluginStoreService from '@/services/plugin/web/PluginStoreService'

function buildStore(results: any[]) {
  return {
    state: {
      connection: {
        executeQuery: jest.fn().mockResolvedValue(results)
      },
      usedConfig: { id: 42 }
    },
    dispatch: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn()
  } as any
}

const appEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}

describe('PluginStoreService.runQuery', () => {
  it('records a successful plugin query with its origin and plugin ID', async () => {
    const store = buildStore([
      {
        fields: [],
        rows: [{ id: 1 }],
        rowCount: 1,
        totalRowCount: 1,
        affectedRows: 0
      }
    ])
    const service = new PluginStoreService(store, appEventBus)

    await service.runQuery('select 1', 'example-plugin')

    expect(store.dispatch).toHaveBeenCalledWith(
      'data/usedQueries/save',
      expect.objectContaining({
        text: 'select 1',
        numberOfRecords: 1,
        connectionId: 42,
        origin: 'plugin',
        pluginId: 'example-plugin'
      })
    )
  })

  it('does not record a query when execution fails', async () => {
    const store = buildStore([])
    store.state.connection.executeQuery.mockRejectedValue(new Error('query failed'))
    const service = new PluginStoreService(store, appEventBus)

    await expect(service.runQuery('select 1', 'example-plugin')).rejects.toThrow('query failed')
    expect(store.dispatch).not.toHaveBeenCalled()
  })

  it('does not fail the plugin query when history saving fails', async () => {
    const store = buildStore([])
    store.dispatch.mockRejectedValue(new Error('history save failed'))
    const service = new PluginStoreService(store, appEventBus)

    await expect(service.runQuery('select 1', 'example-plugin')).resolves.toEqual({
      results: []
    })
  })
})
