/**
 * Unit tests for ResultTable.vue cell editing methods:
 *   - cellEdited
 *   - maybeUpdateExistingEdit
 *   - createNewEdit
 *   - propogateChanges
 *
 * These methods are tested in isolation by calling them with `.call(mockContext, ...args)`
 * rather than mounting the full component. This avoids Tabulator DOM initialization
 * and keeps tests focused on business logic.
 */

import _ from 'lodash'

// We import the component to access its methods object.
// vue2-jest compiles the SFC; we grab methods from the default export.
import ResultTable from '@/components/editor/ResultTable.vue'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MockCellOptions {
  field: string
  value: any
  oldValue: any
  row?: MockRow
}

interface MockRow {
  getCells: jest.Mock
  getCell: jest.Mock
  update: jest.Mock
  reformat: jest.Mock
  getData: jest.Mock
  _data: Record<string, any>
}

interface MockCell {
  getField: jest.Mock
  getValue: jest.Mock
  getOldValue: jest.Mock
  restoreOldValue: jest.Mock
  getRow: jest.Mock
  getElement: jest.Mock
  _element: HTMLDivElement
  _row: MockRow
}

interface MockTabulator {
  blockRedraw: jest.Mock
  restoreRedraw: jest.Mock
  searchRows: jest.Mock
  redraw: jest.Mock
}

// The class tracker structure used in the internalClassTrackerColumn:
// { edited: Set<string>, editError: Set<string>, editSuccess: Set<string> }

// ---------------------------------------------------------------------------
// Mock Factories
// ---------------------------------------------------------------------------

function createMockElement(): HTMLDivElement {
  return document.createElement('div')
}

function createMockRow(cells: MockCell[] = [], initialData: Record<string, any> = {}): MockRow {
  const data = { ...initialData };
  const row: MockRow = {
    getCells: jest.fn(() => cells),
    getCell: jest.fn((field: string) => cells.find((c) => c.getField() === field)),
    update: jest.fn((updateData: Record<string, any>) => {
      Object.assign(data, updateData);
    }),
    reformat: jest.fn(),
    getData: jest.fn(() => data),
    _data: data,
  }
  return row
}

function createMockCell(opts: MockCellOptions): MockCell {
  const element = createMockElement()
  const row = opts.row ?? createMockRow()

  const cell: MockCell = {
    getField: jest.fn(() => opts.field),
    getValue: jest.fn(() => opts.value),
    getOldValue: jest.fn(() => opts.oldValue),
    restoreOldValue: jest.fn(),
    getRow: jest.fn(() => row),
    getElement: jest.fn(() => element),
    _element: element,
    _row: row,
  }
  return cell
}

function createMockTabulator(searchRowsResult: MockRow[] = []): MockTabulator {
  return {
    blockRedraw: jest.fn(),
    restoreRedraw: jest.fn(),
    searchRows: jest.fn(() => searchRowsResult),
    redraw: jest.fn(),
  }
}

// ---------------------------------------------------------------------------
// editData Factory
// ---------------------------------------------------------------------------

interface FieldDef {
  id: string
  columnName: string
  isPK?: boolean
  linkedTable?: string
  linkedSchema?: string
  editable?: boolean
  generated?: boolean
}

function createEditData(fields: FieldDef[]): Map<string, any> {
  const map = new Map<string, any>()
  for (const f of fields) {
    map.set(f.id, {
      editable: f.editable ?? true,
      id: f.id,
      columnName: f.columnName,
      isPK: f.isPK ?? false,
      linkedTable: f.linkedTable ?? 'users',
      linkedSchema: f.linkedSchema ?? 'public',
      generated: f.generated ?? false,
    })
  }
  return map
}

// ---------------------------------------------------------------------------
// Context Factory
// ---------------------------------------------------------------------------

const methods = (ResultTable as any).methods ?? (ResultTable as any).options?.methods

function createContext(overrides: Record<string, any> = {}) {
  const ctx: Record<string, any> = {
    editData: createEditData([
      { id: 'field_id', columnName: 'id', isPK: true, linkedTable: 'users', linkedSchema: 'public' },
      { id: 'field_name', columnName: 'name', isPK: false, linkedTable: 'users', linkedSchema: 'public' },
      { id: 'field_email', columnName: 'email', isPK: false, linkedTable: 'users', linkedSchema: 'public' },
    ]),
    pendingChanges: {
      updates: [],
      deletes: [],
    },
    propogatedChangesFilters: new Map<string, any>(),
    fieldOriginalClassMap: new Map<string, string>(),
    internalClassTrackerColumn: '__beekeeper_internal_class_tracker',
    tabulator: createMockTabulator(),
    $noty: { error: jest.fn(), success: jest.fn() },
    $set(obj: any, key: string, value: any) {
      obj[key] = value
    },
    $nextTick(fn: () => void) {
      fn()
    },

    // Bind the sub-methods so cellEdited can call them via this.*
    maybeUpdateExistingEdit: methods.maybeUpdateExistingEdit,
    createNewEdit: methods.createNewEdit,
    propogateChanges: methods.propogateChanges,

    ...overrides,
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Helper to build a standard scenario: a row with PK + data cells
// ---------------------------------------------------------------------------

function buildRowWithCells(opts: {
  pkField?: string
  pkValue?: any
  pkOldValue?: any
  dataField?: string
  dataValue?: any
  dataOldValue?: any
}) {
  const {
    pkField = 'field_id',
    pkValue = 1,
    pkOldValue = 1,
    dataField = 'field_name',
    dataValue = 'Alice',
    dataOldValue = 'Bob',
  } = opts

  const pkCell = createMockCell({ field: pkField, value: pkValue, oldValue: pkOldValue })
  const dataCell = createMockCell({ field: dataField, value: dataValue, oldValue: dataOldValue })

  const row = createMockRow([pkCell, dataCell])
  pkCell.getRow.mockReturnValue(row)
  dataCell.getRow.mockReturnValue(row)
  pkCell._row = row
  dataCell._row = row

  return { pkCell, dataCell, row }
}

// ===========================================================================
// Tests
// ===========================================================================

describe('ResultTable - Cell Editing Methods', () => {
  // -----------------------------------------------------------------------
  // cellEdited
  // -----------------------------------------------------------------------
  describe('cellEdited', () => {
    it('should return early when editData has no matching field', () => {
      const ctx = createContext()
      const cell = createMockCell({ field: 'nonexistent_field', value: 'x', oldValue: 'y' })

      methods.cellEdited.call(ctx, cell)

      expect(ctx.pendingChanges.updates).toHaveLength(0)
      expect(ctx.$noty.error).not.toHaveBeenCalled()
    })

    it('should return early when old value equals new value (loose equality)', () => {
      const { dataCell } = buildRowWithCells({ dataValue: 'same', dataOldValue: 'same' })
      const ctx = createContext()

      methods.cellEdited.call(ctx, dataCell)

      expect(ctx.pendingChanges.updates).toHaveLength(0)
    })

    it('should return early when old value loosely equals new value (number vs string)', () => {
      const { dataCell } = buildRowWithCells({ dataValue: '42', dataOldValue: 42 })
      const ctx = createContext()

      methods.cellEdited.call(ctx, dataCell)

      // 42 == '42' is true in JS (loose equality), so it should return early
      expect(ctx.pendingChanges.updates).toHaveLength(0)
    })

    it('should show error and restore old value when no PK cells found', () => {
      // editData has no PK fields for this table
      const editData = createEditData([
        { id: 'field_name', columnName: 'name', isPK: false, linkedTable: 'users', linkedSchema: 'public' },
      ])
      const ctx = createContext({ editData })

      const cell = createMockCell({ field: 'field_name', value: 'New', oldValue: 'Old' })
      const row = createMockRow([cell])
      cell.getRow.mockReturnValue(row)

      methods.cellEdited.call(ctx, cell)

      expect(ctx.$noty.error).toHaveBeenCalledWith("Can't edit column -- couldn't figure out primary key")
      expect(cell.restoreOldValue).toHaveBeenCalled()
      expect(ctx.pendingChanges.updates).toHaveLength(0)
    })

    it('should show error when PK field count does not match PK cell count', () => {
      // editData declares 2 PK fields, but the row only has 1 of them
      const editData = createEditData([
        { id: 'field_id', columnName: 'id', isPK: true, linkedTable: 'users', linkedSchema: 'public' },
        { id: 'field_id2', columnName: 'id2', isPK: true, linkedTable: 'users', linkedSchema: 'public' },
        { id: 'field_name', columnName: 'name', isPK: false, linkedTable: 'users', linkedSchema: 'public' },
      ])
      const ctx = createContext({ editData })

      // Row only has field_id and field_name, missing field_id2
      const pkCell = createMockCell({ field: 'field_id', value: 1, oldValue: 1 })
      const dataCell = createMockCell({ field: 'field_name', value: 'New', oldValue: 'Old' })
      const row = createMockRow([pkCell, dataCell])
      pkCell.getRow.mockReturnValue(row)
      dataCell.getRow.mockReturnValue(row)

      methods.cellEdited.call(ctx, dataCell)

      expect(ctx.$noty.error).toHaveBeenCalledWith("Can't edit column -- couldn't figure out primary key")
      expect(dataCell.restoreOldValue).toHaveBeenCalled()
    })

    it('should create a new edit when no existing edit matches', () => {
      const { dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })
      const ctx = createContext()

      methods.cellEdited.call(ctx, dataCell)

      expect(ctx.pendingChanges.updates).toHaveLength(1)
      const update = ctx.pendingChanges.updates[0]
      expect(update.key).toBe('1-field_name')
      expect(update.table).toBe('users')
      expect(update.schema).toBe('public')
      expect(update.column).toBe('name')
      expect(update.value).toBe('Alice')
      expect(update.oldValue).toBe('Bob')
      expect(update.primaryKeys).toEqual([{ column: 'id', value: 1 }])
    })

    it('should update an existing edit rather than creating a duplicate', () => {
      const { dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Charlie',
        dataOldValue: 'Bob',
      })

      const existingEdit = {
        key: '1-field_name',
        table: 'users',
        schema: 'public',
        column: 'name',
        primaryKeys: [{ column: 'id', value: 1 }],
        oldValue: 'Alice',
        value: 'Bob',
        cell: dataCell,
      }

      const ctx = createContext()
      ctx.pendingChanges.updates = [existingEdit]

      methods.cellEdited.call(ctx, dataCell)

      // Should have updated existing edit in place, not added another
      expect(ctx.pendingChanges.updates).toHaveLength(1)
      expect(existingEdit.value).toBe('Charlie')
    })

    it('should call propogateChanges after processing the edit', () => {
      const { dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })
      const ctx = createContext()
      ctx.propogateChanges = jest.fn()

      methods.cellEdited.call(ctx, dataCell)

      expect(ctx.propogateChanges).toHaveBeenCalled()
    })

    it('should return early when editData is null', () => {
      const ctx = createContext({ editData: null })
      const cell = createMockCell({ field: 'field_name', value: 'x', oldValue: 'y' })

      methods.cellEdited.call(ctx, cell)

      expect(ctx.pendingChanges.updates).toHaveLength(0)
      expect(ctx.$noty.error).not.toHaveBeenCalled()
    })

    it('should handle composite primary keys correctly', () => {
      const editData = createEditData([
        { id: 'field_id', columnName: 'id', isPK: true, linkedTable: 'orders', linkedSchema: 'public' },
        { id: 'field_tenant', columnName: 'tenant_id', isPK: true, linkedTable: 'orders', linkedSchema: 'public' },
        { id: 'field_status', columnName: 'status', isPK: false, linkedTable: 'orders', linkedSchema: 'public' },
      ])

      const pk1 = createMockCell({ field: 'field_id', value: 10, oldValue: 10 })
      const pk2 = createMockCell({ field: 'field_tenant', value: 'acme', oldValue: 'acme' })
      const dataCell = createMockCell({ field: 'field_status', value: 'shipped', oldValue: 'pending' })
      const row = createMockRow([pk1, pk2, dataCell])
      pk1.getRow.mockReturnValue(row)
      pk2.getRow.mockReturnValue(row)
      dataCell.getRow.mockReturnValue(row)

      const ctx = createContext({ editData })

      methods.cellEdited.call(ctx, dataCell)

      expect(ctx.pendingChanges.updates).toHaveLength(1)
      const update = ctx.pendingChanges.updates[0]
      // key should join both PK values: "10-acme-field_status"
      expect(update.key).toBe('10-acme-field_status')
      expect(update.primaryKeys).toEqual([
        { column: 'id', value: 10 },
        { column: 'tenant_id', value: 'acme' },
      ])
      expect(update.value).toBe('shipped')
    })

    it('should pass removeEdited=true to propogateChanges when edit reverts but hasCurrent was true', () => {
      // This tests the branch: !existingEdited && hasCurrent
      // maybeUpdateExistingEdit returns false (revert removes the edit), but _.some found a match before calling it
      const { dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Original', // same as oldValue in the pending edit, triggering a revert
        dataOldValue: 'Temp',
      })

      const existingEdit = {
        key: '1-field_name',
        table: 'users',
        schema: 'public',
        column: 'name',
        primaryKeys: [{ column: 'id', value: 1 }],
        oldValue: 'Original', // matches cell.getValue(), so maybeUpdateExistingEdit will revert
        value: 'Temp',
        cell: dataCell,
      }

      const ctx = createContext()
      ctx.pendingChanges.updates = [existingEdit]
      ctx.propogateChanges = jest.fn()

      methods.cellEdited.call(ctx, dataCell)

      // hasCurrent was true (_.some found the key), existingEdited is false (revert),
      // so propogateChanges should be called with removeEdited = !false && true = true
      expect(ctx.propogateChanges).toHaveBeenCalledWith(
        expect.any(Array),
        dataCell,
        '1-field_name',
        true
      )
      // createNewEdit should NOT have been called (the edit was reverted, not new)
      // so pendingChanges.updates should be empty (the revert removed it)
      expect(ctx.pendingChanges.updates).toHaveLength(0)
    })

    it('should treat null-to-null as no change and return early', () => {
      const { dataCell } = buildRowWithCells({ dataValue: null, dataOldValue: null })
      const ctx = createContext()

      methods.cellEdited.call(ctx, dataCell)

      expect(ctx.pendingChanges.updates).toHaveLength(0)
    })

    it('should treat null-to-value as a real change', () => {
      const { dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'something',
        dataOldValue: null,
      })
      const ctx = createContext()

      methods.cellEdited.call(ctx, dataCell)

      expect(ctx.pendingChanges.updates).toHaveLength(1)
      expect(ctx.pendingChanges.updates[0].oldValue).toBeNull()
      expect(ctx.pendingChanges.updates[0].value).toBe('something')
    })

    it('should only match PK fields from the same linkedTable and linkedSchema', () => {
      // Two tables in the same editData, each with their own PK
      const editData = createEditData([
        { id: 'field_user_id', columnName: 'id', isPK: true, linkedTable: 'users', linkedSchema: 'public' },
        { id: 'field_order_id', columnName: 'id', isPK: true, linkedTable: 'orders', linkedSchema: 'public' },
        { id: 'field_user_name', columnName: 'name', isPK: false, linkedTable: 'users', linkedSchema: 'public' },
      ])

      const userPk = createMockCell({ field: 'field_user_id', value: 1, oldValue: 1 })
      const orderPk = createMockCell({ field: 'field_order_id', value: 99, oldValue: 99 })
      const nameCell = createMockCell({ field: 'field_user_name', value: 'Alice', oldValue: 'Bob' })
      const row = createMockRow([userPk, orderPk, nameCell])
      userPk.getRow.mockReturnValue(row)
      orderPk.getRow.mockReturnValue(row)
      nameCell.getRow.mockReturnValue(row)

      const ctx = createContext({ editData })

      methods.cellEdited.call(ctx, nameCell)

      // Should only use user PK, not order PK
      expect(ctx.pendingChanges.updates).toHaveLength(1)
      expect(ctx.pendingChanges.updates[0].primaryKeys).toEqual([{ column: 'id', value: 1 }])
      expect(ctx.pendingChanges.updates[0].key).toBe('1-field_user_name')
    })

    it('should add the edited field to the class tracker on matching rows via propogateChanges', () => {
      const { dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      // Create a duplicate row that searchRows will return
      const dupRow = createMockRow([])
      const mockTabulator = createMockTabulator([dupRow])
      const ctx = createContext({ tabulator: mockTabulator })

      methods.cellEdited.call(ctx, dataCell)

      // The pending update should be created
      expect(ctx.pendingChanges.updates).toHaveLength(1)

      // propogateChanges should have updated the duplicate row's class tracker
      expect(dupRow.update).toHaveBeenCalled()
      const updateArg = dupRow.update.mock.calls[0][0]
      const tracker = updateArg.__beekeeper_internal_class_tracker
      expect(tracker).toBeDefined()
      expect(tracker.edited).toBeInstanceOf(Set)
      expect(tracker.edited.has('field_name')).toBe(true)
      expect(dupRow.reformat).toHaveBeenCalled()
    })

    it('should remove the edited field from the class tracker when an edit is reverted', () => {
      const { dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Original', // same as existing edit's oldValue, triggering revert
        dataOldValue: 'Temp',
      })

      const existingEdit = {
        key: '1-field_name',
        table: 'users',
        schema: 'public',
        column: 'name',
        primaryKeys: [{ column: 'id', value: 1 }],
        oldValue: 'Original',
        value: 'Temp',
        cell: dataCell,
      }

      // Pre-populate a duplicate row with the field already in the edited set
      const existingTracker = {
        edited: new Set<string>(['field_name']),
        editError: new Set<string>(),
        editSuccess: new Set<string>(),
      }
      const dupRow = createMockRow([], {
        __beekeeper_internal_class_tracker: existingTracker,
      })

      const mockTabulator = createMockTabulator([dupRow])
      const ctx = createContext({ tabulator: mockTabulator })
      ctx.pendingChanges.updates = [existingEdit]

      methods.cellEdited.call(ctx, dataCell)

      // The revert should have removed the edit from pending updates
      expect(ctx.pendingChanges.updates).toHaveLength(0)

      // propogateChanges should have been called with removeEdited=true,
      // which removes the field from the tracker's edited set
      expect(dupRow.update).toHaveBeenCalled()
      const updateArg = dupRow.update.mock.calls[0][0]
      expect(updateArg.__beekeeper_internal_class_tracker.edited.has('field_name')).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // maybeUpdateExistingEdit
  // -----------------------------------------------------------------------
  describe('maybeUpdateExistingEdit', () => {
    it('should return false when no current edit exists', () => {
      const cell = createMockCell({ field: 'field_name', value: 'New', oldValue: 'Old' })
      const ctx = createContext()

      const result = methods.maybeUpdateExistingEdit.call(ctx, 'some-key', cell)

      expect(result).toBe(false)
    })

    it('should return true when oldValue is undefined and new value is null', () => {
      const cell = createMockCell({ field: 'field_name', value: null, oldValue: 'Old' })
      const ctx = createContext()
      ctx.pendingChanges.updates = [
        { key: 'the-key', oldValue: undefined, value: 'something' },
      ]

      const result = methods.maybeUpdateExistingEdit.call(ctx, 'the-key', cell)

      // undefined == null is true, but the code explicitly guards this case
      expect(result).toBe(true)
      // The edit should remain untouched
      expect(ctx.pendingChanges.updates).toHaveLength(1)
    })

    it('should remove edit when value reverts to original', () => {
      const cell = createMockCell({ field: 'field_name', value: 'Original', oldValue: 'Temp' })
      const existingEdit = { key: 'the-key', oldValue: 'Original', value: 'Temp' }
      const ctx = createContext()
      ctx.pendingChanges.updates = [existingEdit]

      const result = methods.maybeUpdateExistingEdit.call(ctx, 'the-key', cell)

      expect(result).toBe(false)
      expect(ctx.pendingChanges.updates).toHaveLength(0)
    })

    it('should update existing edit value and return true when value differs', () => {
      const cell = createMockCell({ field: 'field_name', value: 'NewValue', oldValue: 'Temp' })
      const existingEdit = { key: 'the-key', oldValue: 'Original', value: 'Temp' }
      const ctx = createContext()
      ctx.pendingChanges.updates = [existingEdit]

      const result = methods.maybeUpdateExistingEdit.call(ctx, 'the-key', cell)

      expect(result).toBe(true)
      expect(existingEdit.value).toBe('NewValue')
    })

    it('should treat oldValue 0 and cell value empty string as revert due to loose equality', () => {
      // 0 == '' is true in JavaScript, so this triggers the revert branch
      const cell = createMockCell({ field: 'field_name', value: '', oldValue: 'whatever' })
      const existingEdit = { key: 'the-key', oldValue: 0, value: 'something' }
      const ctx = createContext()
      ctx.pendingChanges.updates = [existingEdit]

      const result = methods.maybeUpdateExistingEdit.call(ctx, 'the-key', cell)

      // 0 == '' is true, so it enters the revert branch
      expect(result).toBe(false)
      expect(ctx.pendingChanges.updates).toHaveLength(0)
    })

    it('should only match the edit with the correct key when multiple edits exist', () => {
      const cell = createMockCell({ field: 'field_name', value: 'Updated', oldValue: 'Old' })
      const editA = { key: 'key-a', oldValue: 'X', value: 'Y' }
      const editB = { key: 'key-b', oldValue: 'M', value: 'N' }
      const ctx = createContext()
      ctx.pendingChanges.updates = [editA, editB]

      const result = methods.maybeUpdateExistingEdit.call(ctx, 'key-b', cell)

      expect(result).toBe(true)
      // editB should be updated, editA should be untouched
      expect(editB.value).toBe('Updated')
      expect(editA.value).toBe('Y')
      expect(ctx.pendingChanges.updates).toHaveLength(2)
    })

    it('should return true and leave edit untouched for the undefined/null case', () => {
      const cell = createMockCell({ field: 'field_name', value: null, oldValue: 'x' })
      const existingEdit = { key: 'the-key', oldValue: undefined, value: 'y' }
      const ctx = createContext()
      ctx.pendingChanges.updates = [existingEdit]

      const result = methods.maybeUpdateExistingEdit.call(ctx, 'the-key', cell)

      // undefined == null is true, so the guard returns true without modifying
      expect(result).toBe(true)
      expect(ctx.pendingChanges.updates).toHaveLength(1)
      expect(existingEdit.value).toBe('y') // unchanged
    })
  })

  // -----------------------------------------------------------------------
  // createNewEdit
  // -----------------------------------------------------------------------
  describe('createNewEdit', () => {
    it('should create a correct TableUpdatePayload', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 42,
        dataField: 'field_email',
        dataValue: 'alice@example.com',
        dataOldValue: 'bob@example.com',
      })
      const ctx = createContext()

      const fieldEditData = ctx.editData.get('field_email')
      const pkData = ctx.editData.get('field_id')

      const cellData = { cell: dataCell, data: fieldEditData }
      const pks = [{ cell: pkCell, data: pkData }]

      methods.createNewEdit.call(ctx, '42-field_email', cellData, pks)

      expect(ctx.pendingChanges.updates).toHaveLength(1)
      const payload = ctx.pendingChanges.updates[0]

      expect(payload).toEqual(
        expect.objectContaining({
          key: '42-field_email',
          table: 'users',
          schema: 'public',
          column: 'email',
          value: 'alice@example.com',
          oldValue: 'bob@example.com',
          primaryKeys: [{ column: 'id', value: 42 }],
        })
      )
    })

    it('should use getOldValue for PK when the PK cell is the one being edited', () => {
      // Scenario: editing the primary key column itself (e.g., Redis key renaming)
      const pkCell = createMockCell({ field: 'field_id', value: 'new-key', oldValue: 'old-key' })
      const row = createMockRow([pkCell])
      pkCell.getRow.mockReturnValue(row)

      const ctx = createContext()
      const pkFieldData = ctx.editData.get('field_id')

      // The PK cell IS the cell being edited, so pkCell === cell
      const cellData = { cell: pkCell, data: pkFieldData }
      const pks = [{ cell: pkCell, data: pkFieldData }]

      methods.createNewEdit.call(ctx, 'old-key-field_id', cellData, pks)

      const payload = ctx.pendingChanges.updates[0]
      // Should use getOldValue ('old-key') for the PK, not getValue ('new-key')
      expect(payload.primaryKeys).toEqual([{ column: 'id', value: 'old-key' }])
    })

    it('should replace existing pending update with the same key', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Third',
        dataOldValue: 'Second',
      })
      const ctx = createContext()

      // Pre-populate with an existing update at the same key
      ctx.pendingChanges.updates = [
        {
          key: '1-field_name',
          table: 'users',
          schema: 'public',
          column: 'name',
          primaryKeys: [{ column: 'id', value: 1 }],
          oldValue: 'First',
          value: 'Second',
          cell: dataCell,
        },
      ]

      const fieldEditData = ctx.editData.get('field_name')
      const pkData = ctx.editData.get('field_id')
      const cellData = { cell: dataCell, data: fieldEditData }
      const pks = [{ cell: pkCell, data: pkData }]

      methods.createNewEdit.call(ctx, '1-field_name', cellData, pks)

      // The old one should be rejected and replaced, not duplicated
      expect(ctx.pendingChanges.updates).toHaveLength(1)
      expect(ctx.pendingChanges.updates[0].value).toBe('Third')
      expect(ctx.pendingChanges.updates[0].oldValue).toBe('Second')
    })

    it('should use getValue for non-edited PK cells in a composite key', () => {
      // Composite PK: (id, tenant_id), editing id column
      const editData = createEditData([
        { id: 'field_id', columnName: 'id', isPK: true, linkedTable: 'items', linkedSchema: 'public' },
        { id: 'field_tenant', columnName: 'tenant_id', isPK: true, linkedTable: 'items', linkedSchema: 'public' },
        { id: 'field_name', columnName: 'name', isPK: false, linkedTable: 'items', linkedSchema: 'public' },
      ])

      const pkCell1 = createMockCell({ field: 'field_id', value: 'new-id', oldValue: 'old-id' })
      const pkCell2 = createMockCell({ field: 'field_tenant', value: 'acme', oldValue: 'acme' })
      const row = createMockRow([pkCell1, pkCell2])
      pkCell1.getRow.mockReturnValue(row)
      pkCell2.getRow.mockReturnValue(row)

      const ctx = createContext({ editData })
      const pkData1 = ctx.editData.get('field_id')
      const pkData2 = ctx.editData.get('field_tenant')

      // Editing pkCell1 (the id column)
      const cellData = { cell: pkCell1, data: pkData1 }
      const pks = [
        { cell: pkCell1, data: pkData1 },
        { cell: pkCell2, data: pkData2 },
      ]

      methods.createNewEdit.call(ctx, 'old-id-acme-field_id', cellData, pks)

      const payload = ctx.pendingChanges.updates[0]
      // pkCell1 === cell, so use getOldValue ('old-id')
      // pkCell2 !== cell, so use getValue ('acme')
      expect(payload.primaryKeys).toEqual([
        { column: 'id', value: 'old-id' },
        { column: 'tenant_id', value: 'acme' },
      ])
    })

    it('should preserve unrelated pending updates when adding a new one', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })
      const ctx = createContext()

      // Pre-populate with an unrelated update
      const unrelatedUpdate = {
        key: '99-field_email',
        table: 'users',
        schema: 'public',
        column: 'email',
        primaryKeys: [{ column: 'id', value: 99 }],
        oldValue: 'old@test.com',
        value: 'new@test.com',
        cell: createMockCell({ field: 'field_email', value: 'new@test.com', oldValue: 'old@test.com' }),
      }
      ctx.pendingChanges.updates = [unrelatedUpdate]

      const fieldEditData = ctx.editData.get('field_name')
      const pkData = ctx.editData.get('field_id')
      const cellData = { cell: dataCell, data: fieldEditData }
      const pks = [{ cell: pkCell, data: pkData }]

      methods.createNewEdit.call(ctx, '1-field_name', cellData, pks)

      // Both should exist
      expect(ctx.pendingChanges.updates).toHaveLength(2)
      expect(ctx.pendingChanges.updates[0]).toBe(unrelatedUpdate)
      expect(ctx.pendingChanges.updates[1].key).toBe('1-field_name')
    })

    it('should set dataset to null and columnType/columnObject to undefined', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })
      const ctx = createContext()

      const fieldEditData = ctx.editData.get('field_name')
      const pkData = ctx.editData.get('field_id')
      const cellData = { cell: dataCell, data: fieldEditData }
      const pks = [{ cell: pkCell, data: pkData }]

      methods.createNewEdit.call(ctx, '1-field_name', cellData, pks)

      const payload = ctx.pendingChanges.updates[0]
      expect(payload.dataset).toBeNull()
      expect(payload.columnType).toBeUndefined()
      expect(payload.columnObject).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // propogateChanges
  // -----------------------------------------------------------------------
  describe('propogateChanges', () => {
    it('should search for matching rows and track edited field in class tracker', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      const dupRow = createMockRow([])
      const mockTabulator = createMockTabulator([dupRow])
      const ctx = createContext({ tabulator: mockTabulator })

      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', false)

      expect(mockTabulator.blockRedraw).toHaveBeenCalled()
      expect(mockTabulator.searchRows).toHaveBeenCalledWith([
        { field: 'field_id', type: '=', value: 1 },
      ])
      // The row should have been updated with the new value and a class tracker
      expect(dupRow.update).toHaveBeenCalled()
      const updateArg = dupRow.update.mock.calls[0][0]
      expect(updateArg.field_name).toBe('Alice')
      expect(updateArg.__beekeeper_internal_class_tracker.edited).toBeInstanceOf(Set)
      expect(updateArg.__beekeeper_internal_class_tracker.edited.has('field_name')).toBe(true)
      expect(dupRow.reformat).toHaveBeenCalled()
      expect(mockTabulator.restoreRedraw).toHaveBeenCalled()
      expect(mockTabulator.redraw).toHaveBeenCalled()
    })

    it('should cache filters and reuse on subsequent calls', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      const dupRow = createMockRow([])
      const mockTabulator = createMockTabulator([dupRow])
      const ctx = createContext({ tabulator: mockTabulator })

      // First call — should build and cache filters
      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', false)
      expect(ctx.propogatedChangesFilters.has('1-field_name')).toBe(true)
      expect(ctx.propogatedChangesFilters.get('1-field_name')).toEqual([
        { field: 'field_id', type: '=', value: 1 },
      ])

      // Second call with same key — should reuse cached filters, still call searchRows (filters are cached, not results)
      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', false)

      // searchRows is called each time (only the filters are cached, not the search results)
      expect(mockTabulator.searchRows).toHaveBeenCalledTimes(2)

      // Should still have updated the rows
      expect(dupRow.update).toHaveBeenCalledTimes(2)
    })

    it('should remove field from edited set when removeEdited is true', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      // Pre-populate the row data with a class tracker that already has 'field_name' in the edited set
      const existingTracker = {
        edited: new Set<string>(['field_name']),
        editError: new Set<string>(),
        editSuccess: new Set<string>(),
      }
      const dupRow = createMockRow([], {
        __beekeeper_internal_class_tracker: existingTracker,
      })

      const mockTabulator = createMockTabulator([dupRow])
      const ctx = createContext({ tabulator: mockTabulator })

      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', true)

      // The update call should have removed 'field_name' from the edited set
      const updateArg = dupRow.update.mock.calls[0][0]
      expect(updateArg.__beekeeper_internal_class_tracker.edited.has('field_name')).toBe(false)
    })

    it('should update all matching rows and reformat each', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      // Multiple duplicate rows
      const dupRow1 = createMockRow([])
      const dupRow2 = createMockRow([])

      const mockTabulator = createMockTabulator([dupRow1, dupRow2])
      const ctx = createContext({ tabulator: mockTabulator })

      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', false)

      // Both rows should have been updated and reformatted
      expect(dupRow1.update).toHaveBeenCalled()
      expect(dupRow2.update).toHaveBeenCalled()
      expect(dupRow1.reformat).toHaveBeenCalled()
      expect(dupRow2.reformat).toHaveBeenCalled()

      // Both should contain the field value update
      expect(dupRow1.update.mock.calls[0][0].field_name).toBe('Alice')
      expect(dupRow2.update.mock.calls[0][0].field_name).toBe('Alice')
    })

    it('should handle no matching rows gracefully', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      // searchRows returns empty array
      const mockTabulator = createMockTabulator([])
      const ctx = createContext({ tabulator: mockTabulator })

      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', false)

      expect(mockTabulator.searchRows).toHaveBeenCalled()
      // Should still cache the filters
      expect(ctx.propogatedChangesFilters.has('1-field_name')).toBe(true)
      expect(ctx.propogatedChangesFilters.get('1-field_name')).toEqual([
        { field: 'field_id', type: '=', value: 1 },
      ])
      // blockRedraw/restoreRedraw should still be called (redraw lifecycle is maintained)
      expect(mockTabulator.blockRedraw).toHaveBeenCalled()
      expect(mockTabulator.restoreRedraw).toHaveBeenCalled()
      expect(mockTabulator.redraw).toHaveBeenCalled()
    })

    it('should build filters for multiple PK cells in a composite key', () => {
      const editData = createEditData([
        { id: 'field_id', columnName: 'id', isPK: true, linkedTable: 'orders', linkedSchema: 'public' },
        { id: 'field_tenant', columnName: 'tenant_id', isPK: true, linkedTable: 'orders', linkedSchema: 'public' },
        { id: 'field_status', columnName: 'status', isPK: false, linkedTable: 'orders', linkedSchema: 'public' },
      ])

      const pk1 = createMockCell({ field: 'field_id', value: 10, oldValue: 10 })
      const pk2 = createMockCell({ field: 'field_tenant', value: 'acme', oldValue: 'acme' })
      const dataCell = createMockCell({ field: 'field_status', value: 'shipped', oldValue: 'pending' })

      const mockTabulator = createMockTabulator([])
      const ctx = createContext({ editData, tabulator: mockTabulator })

      methods.propogateChanges.call(ctx, [pk1, pk2], dataCell, '10-acme-field_status', false)

      expect(mockTabulator.searchRows).toHaveBeenCalledWith([
        { field: 'field_id', type: '=', value: 10 },
        { field: 'field_tenant', type: '=', value: 'acme' },
      ])
    })

    it('should always call blockRedraw before and restoreRedraw after row updates', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      const dupRow = createMockRow([])
      const mockTabulator = createMockTabulator([dupRow])
      const ctx = createContext({ tabulator: mockTabulator })

      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', false)

      // Verify ordering: blockRedraw is called before restoreRedraw
      const blockOrder = mockTabulator.blockRedraw.mock.invocationCallOrder[0]
      const restoreOrder = mockTabulator.restoreRedraw.mock.invocationCallOrder[0]
      const updateOrder = dupRow.update.mock.invocationCallOrder[0]
      expect(blockOrder).toBeLessThan(updateOrder)
      expect(updateOrder).toBeLessThan(restoreOrder)
    })

    it('should initialize class tracker on row data if not present', () => {
      const { pkCell, dataCell } = buildRowWithCells({
        pkValue: 1,
        dataField: 'field_name',
        dataValue: 'Alice',
        dataOldValue: 'Bob',
      })

      // Row starts with no class tracker data
      const dupRow = createMockRow([])
      const mockTabulator = createMockTabulator([dupRow])
      const ctx = createContext({ tabulator: mockTabulator })

      methods.propogateChanges.call(ctx, [pkCell], dataCell, '1-field_name', false)

      const updateArg = dupRow.update.mock.calls[0][0]
      const tracker = updateArg.__beekeeper_internal_class_tracker
      expect(tracker).toBeDefined()
      expect(tracker.edited).toBeInstanceOf(Set)
      expect(tracker.editError).toBeInstanceOf(Set)
      expect(tracker.editSuccess).toBeInstanceOf(Set)
    })
  })
})
