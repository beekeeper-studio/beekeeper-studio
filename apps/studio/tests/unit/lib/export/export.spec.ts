import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Export } from '@/lib/export/export'
import { ExportStatus } from '@/lib/export/models'
import { CsvExporter } from '@/lib/export/formats/csv'
import ExportModal from '@/components/export/ExportModal.vue'
import type { TableColumn } from '@/lib/db/models'

Vue.use(Vuex)
// ExportModal's template uses these directives; register no-ops so a shallow
// mount doesn't trip over unresolved custom directives.
Vue.directive('kbd-trap', {})
Vue.directive('tooltip', {})

// Minimal concrete Export subclass for unit testing
class TestExporter extends Export {
  readonly rowSeparator = '\n'
  async getHeader(_columns: TableColumn[]): Promise<string> { return '' }
  getFooter(): string { return '' }
  formatRow(_data: any[]): string { return '' }
}

function makeExporter(): TestExporter {
  return new TestExporter(
    '/tmp/test.export',
    { connectionType: 'sqlite' } as any,
    { name: 'test_table' } as any,
    '',
    'test',
    [],
    { chunkSize: 100, deleteOnAbort: false },
    false
  )
}

describe('Export.percentComplete', () => {
  let exporter: TestExporter

  beforeEach(() => {
    exporter = makeExporter()
  })

  it('returns 0 when countTotal is 0 (not NaN)', () => {
    exporter.countTotal = 0
    exporter.countExported = 0
    expect(exporter.percentComplete).toBe(0)
    expect(Number.isNaN(exporter.percentComplete)).toBe(false)
  })

  it('returns 0 when countExported is also 0 but countTotal is set', () => {
    exporter.countTotal = 1000
    exporter.countExported = 0
    expect(exporter.percentComplete).toBe(0)
  })

  it('calculates the correct percentage during export', () => {
    exporter.countTotal = 200
    exporter.countExported = 100
    expect(exporter.percentComplete).toBe(50)
  })

  it('never exceeds 100 even when countExported exceeds countTotal', () => {
    // This was the root cause of the ">100%" bug: if countTotal was
    // underreported (e.g., set to the chunk size rather than the full row
    // count), countExported could surpass it and the percentage would show
    // as 100%, 200%, 300%… causing the notification to close prematurely.
    exporter.countTotal = 100
    exporter.countExported = 200
    expect(exporter.percentComplete).toBe(100)
    expect(exporter.percentComplete).toBeLessThanOrEqual(100)
  })

  it('returns 100 when status is Completed regardless of row counts', () => {
    exporter.countTotal = 500
    exporter.countExported = 0
    // Set status directly via private field to bypass notify()
    ;(exporter as any)._status = ExportStatus.Completed
    expect(exporter.percentComplete).toBe(100)
  })

  it('returns 100 when status is Aborted', () => {
    exporter.countTotal = 500
    exporter.countExported = 50
    ;(exporter as any)._status = ExportStatus.Aborted
    expect(exporter.percentComplete).toBe(100)
  })

  it('returns 100 when status is Error', () => {
    exporter.countTotal = 500
    exporter.countExported = 50
    ;(exporter as any)._status = ExportStatus.Error
    expect(exporter.percentComplete).toBe(100)
  })

  it('progress callbacks receive a clamped percentComplete', () => {
    const received: number[] = []
    exporter.onProgress((p) => received.push(p.percentComplete))

    exporter.countTotal = 100
    exporter.countExported = 150  // exceeds total
    exporter.notify()

    expect(received[0]).toBeLessThanOrEqual(100)
    expect(received[0]).toBeGreaterThanOrEqual(0)
  })
})

// Streams one chunk of rows, then signals end-of-cursor — the shape
// export.ts expects from connection.selectTopStream(...).cursor.
function makeCursor(rows: any[][]) {
  let served = false
  return {
    columns: undefined as any,
    async start() { /* no-op */ },
    async read() {
      if (served) return []
      served = true
      return rows
    },
    async close() { /* no-op */ },
  }
}

const skipOnWindows = process.platform === 'win32' ? it.skip : it

// A connected database server fully controls table/schema metadata. ExportModal
// builds the export filename straight from that metadata with no sanitization:
//
//   const schema = this.table.schema ? `${this.table.schema}_` : ''
//   fileName = `${schema}${this.table.name}_export_${formatted}.${extension}`
//   return window.main.join(this.fileDirectory, this.fileName)  // path.join
//
// (The query-export branch right beside it DOES sanitize its name via
// .replace(/[^a-z0-9]/gi, '_'); the table branch — the remote-controlled
// input — does not.) A server-supplied name like `../outside/pwned` makes
// path.join walk out of the directory the user chose in the export dialog, so
// export.ts's fs.promises.open(filePath, 'w+') writes the file — with
// attacker-controlled row content — OUTSIDE the approved directory. No access
// to the victim's machine is needed: they only have to export a table from a
// hostile server.
//
// This test drives the real ExportModal (the unsanitized path construction)
// and the real CsvExporter writer end to end, asserting the secure invariant
// that the export stays inside the chosen directory. It fails today (the file
// escapes) and will pass once the table name is sanitized.
describe('Export path traversal via server-controlled table name', () => {
  beforeAll(() => {
    // window.main.join is literally path.join(...paths) (preload.ts) — no
    // sanitization, so the renderer's filePath is exactly this.
    ;(window as any).main = { join: (...p: string[]) => path.join(...p) }
  })

  function buildStore() {
    return new Vuex.Store({
      getters: {
        dialectData: () => ({ disabledFeatures: { chunkSizeStream: false } }),
      },
    })
  }

  skipOnWindows('does not write the export outside the directory chosen in the dialog', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-export-traversal-'))
    const chosenDir = path.join(root, 'approved-downloads') // the user picks this
    const outsideDir = path.join(root, 'outside')           // never approved
    fs.mkdirSync(chosenDir, { recursive: true })
    fs.mkdirSync(outsideDir, { recursive: true })
    localStorage.removeItem('export/directory')

    try {
      // Table metadata as returned by a hostile server. The name walks one
      // level up out of chosenDir and into the sibling `outside` directory.
      const maliciousTable: any = { name: '../outside/pwned', schema: null, entityType: 'table' }

      // Drive the real ExportModal so the export path is computed by the actual
      // (unsanitized) defaultFileName() / filePath() under test.
      const wrapper = shallowMount(ExportModal as any, {
        store: buildStore(),
        propsData: { table: maliciousTable, query: null, queryName: null, filters: null },
        stubs: { modal: true },
        mocks: {
          $modal: { show: jest.fn(), hide: jest.fn() },
          $config: { downloadsDirectory: chosenDir },
        },
      })

      const filePath = wrapper.vm['filePath'] as string

      // The exported rows are attacker-controlled too — the same server returns
      // them. Stream one through the real CSV exporter.
      const fakeConnection: any = {
        connectionType: 'sqlite',
        async selectTopStream() {
          return {
            columns: [{ columnName: 'data', dataType: 'text' }],
            totalRows: 1,
            cursor: makeCursor([['owned-by-the-remote-server']]),
          }
        },
      }
      const exporter = new CsvExporter(
        filePath,
        fakeConnection,
        maliciousTable,
        null,
        null,
        [],
        { chunkSize: 100, deleteOnAbort: false } as any,
        { header: true, delimiter: ',' },
        false
      )

      await exporter.exportToFile()

      // Guard against a false "secure" pass: if the writer errored before
      // writing, outsideDir would also be empty. Require a completed export.
      expect(exporter.status).toBe(ExportStatus.Completed)

      // Secure invariant: the export must stay inside the chosen directory.
      // Today this FAILS — the server-controlled table name walked path.join()
      // into `outside/`, where the exporter wrote `pwned_export_*.csv`
      // containing the attacker's row.
      expect(fs.readdirSync(outsideDir)).toEqual([])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }, 15000)
})
