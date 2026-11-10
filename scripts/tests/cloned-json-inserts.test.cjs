// Regression coverage for issue #4932. Run: node --test scripts/tests/cloned-json-inserts.test.cjs
// Extracts the real Vue method so the assertions exercise production serialization.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '../../apps/studio/src/components/tableview/TableTable.vue'), 'utf8')
const start = source.indexOf('    buildPendingInserts() {')
const end = source.indexOf('    /**', start)
assert.ok(start !== -1 && end > start, 'buildPendingInserts method must exist')
const method = source.slice(start, end).trim().replace(/,\s*$/, '')
const lodash = { isObject: (value) => value !== null && (typeof value === 'object' || typeof value === 'function') }
const buildPendingInserts = new Function('_', 'return ({' + method + '}).buildPendingInserts')(lodash)

function insertFor(dataType, value, dialect = 'mysql') {
  const ctx = {
    table: { name: 'sample', schema: null, columns: [{ columnName: 'payload', dataType }] },
    pendingChanges: { inserts: [{ row: { getData: () => ({ payload: value }) } }] },
    dialect,
    dialectData: { requireDataset: false },
    isPrimaryKey: () => false
  }
  return buildPendingInserts.call(ctx)[0].data[0].payload
}

test('MySQL empty JSON array and object are serialized', () => {
  assert.equal(insertFor('json', []), '[]')
  assert.equal(insertFor('json', {}), '{}')
})
test('MySQL nonempty JSON array and nested object are serialized', () => {
  assert.equal(insertFor('json', ['a', 'b']), '["a","b"]')
  assert.equal(insertFor('json', { nested: { enabled: true } }), '{"nested":{"enabled":true}}')
})
test('PostgreSQL json and jsonb objects are serialized', () => {
  assert.equal(insertFor('json', [], 'postgresql'), '[]')
  assert.equal(insertFor('jsonb', { a: 1 }, 'postgresql'), '{"a":1}')
})
test('Already serialized JSON is not encoded twice', () => {
  assert.equal(insertFor('json', '[]'), '[]')
  assert.equal(insertFor('jsonb', '{"a":1}', 'postgresql'), '{"a":1}')
})
test('Non-JSON arrays and null are unchanged', () => {
  const arr = [1, 2]
  assert.equal(insertFor('integer[]', arr, 'postgresql'), arr)
  assert.equal(insertFor('json', null), null)
})
