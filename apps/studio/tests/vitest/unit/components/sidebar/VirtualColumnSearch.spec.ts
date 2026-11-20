import { describe, expect, it } from 'vitest'
import VirtualTableList from '@/components/sidebar/core/table_list/VirtualTableList.vue'

describe('virtual sidebar column search', () => {
  it('keeps equal names in different schemas distinct and hides hidden schemas', () => {
    const tables = [
      { name: 'users', schema: 'public', entityType: 'table' },
      { name: 'users', schema: 'private', entityType: 'table' },
    ]
    const vm: any = {
      schemaTables: [{ schema: null, flatSearch: true, tables, routines: [] }],
      items: [], pins: [], generated: false, searchExpansionSnapshot: null,
      filterQuery: 'users', columnSearch: { query: 'users', results: [] }, database: 'db',
      hiddenEntities: [], hiddenSchemas: ['private'], defaultSchema: 'public', tableMenuOptions: [], schemaMenuOptions: [],
    }
    ;(VirtualTableList as any).options.methods.generateItems.call(vm)
    expect(vm.items).toHaveLength(2)
    expect(vm.items[0].key).not.toBe(vm.items[1].key)
    expect(vm.items.map((item: any) => item.hidden)).toEqual([false, true])
    expect(vm.items[0].entity).toBe(tables[0])
  })
  it('opens matched tables and keeps only matching columns', () => {
    const table = { name: 'users', schema: 'public', entityType: 'table', columns: [{ columnName: 'id' }] }
    const vm: any = {
      schemaTables: [{ schema: 'public', tables: [table], routines: [] }],
      items: [], pins: [], generated: false, searchExpansionSnapshot: null,
      filterQuery: 'email', columnSearch: { query: 'email', results: [{ schemaName: 'public', tableName: 'users', columnName: 'email', dataType: 'text' }] },
      database: 'db', hiddenEntities: [], hiddenSchemas: [], defaultSchema: 'public', tableMenuOptions: [], schemaMenuOptions: [],
    }
    ;(VirtualTableList as any).options.methods.generateItems.call(vm)
    expect(vm.items[0].expanded).toBe(true)
    expect(vm.items[0].matchingColumns.map((c: any) => c.columnName)).toEqual(['email'])
    expect(table.columns[0].columnName).toBe('id')
  })

  it('restores expansion after clearing a column search', () => {
    const table = { name: 'users', schema: 'public', entityType: 'table' }
    const vm: any = {
      schemaTables: [{ schema: 'public', tables: [table], routines: [] }],
      items: [], pins: [], generated: false, searchExpansionSnapshot: null,
      filterQuery: '', columnSearch: { query: '', results: [] },
      database: 'db', hiddenEntities: [], hiddenSchemas: [], defaultSchema: 'public', tableMenuOptions: [], schemaMenuOptions: [],
    }
    const generate = (VirtualTableList as any).options.methods.generateItems
    generate.call(vm)
    expect(vm.items[0].expanded).toBe(false)
    vm.filterQuery = 'email'
    vm.columnSearch = { query: 'email', results: [{ schemaName: 'public', tableName: 'users', columnName: 'email', dataType: 'text' }] }
    generate.call(vm)
    expect(vm.items[0].expanded).toBe(true)
    vm.filterQuery = ''
    generate.call(vm)
    expect(vm.items[0].expanded).toBe(false)
    expect(vm.items[0].matchingColumns).toBeUndefined()
  })
})
