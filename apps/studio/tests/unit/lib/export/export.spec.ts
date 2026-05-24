import { Export } from '@/lib/export/export'
import { ExportStatus } from '@/lib/export/models'
import type { TableColumn } from '@/lib/db/models'

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
