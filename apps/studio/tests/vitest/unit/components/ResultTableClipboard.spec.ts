/**
 * "Copy to Clipboard" in ResultTable must keep every column, even when
 * several columns share the same title (SELECT 1 num, 2 num, 3 num).
 *
 * clipboard() is tested in isolation by calling it with a mock `this`.
 */
import ResultTable from '@/components/editor/ResultTable.vue'
import { BeekeeperPlugin } from '@/plugins/BeekeeperPlugin'

const methods = (ResultTable as any).methods ?? (ResultTable as any).options?.methods

const tableColumns = [
  { title: 'num', field: 'c0' },
  { title: 'num', field: 'c1' },
  { title: 'num', field: 'c2' },
  { title: '__beekeeper_internal_class_tracker', field: '__beekeeper_internal_class_tracker' },
]

async function copy(format: string | null) {
  const writeText = vi.fn()
  const ctx: any = {
    tableColumns,
    tabulator: { getData: () => [{ c0: 1, c1: 2, c2: 3 }] },
    $bks: BeekeeperPlugin,
    $native: { clipboard: { writeText } },
  }
  ctx.dataToJson = methods.dataToJson.bind(ctx)
  await methods.clipboard.call(ctx, format)
  return writeText.mock.calls[0][0] as string
}

describe('ResultTable clipboard with duplicate column titles', () => {
  it('copies all columns as TSV', async () => {
    const out = await copy(null)
    expect(out).toBe('"num"\t"num"\t"num"\r\n"1"\t"2"\t"3"')
  })

  it('copies all columns as Markdown', async () => {
    const out = await copy('md')
    expect(out.split('\n')[0].match(/num/g)).toHaveLength(3)
    expect(out.split('\n')[2]).toMatch(/1.*2.*3/)
  })

  it('copies all values as JSON', async () => {
    const out = JSON.parse(await copy('json'))
    expect(out).toHaveLength(1)
    expect(Object.values(out[0])).toEqual([1, 2, 3])
  })

  it('does not name a duplicate after another real column', () => {
    const cols = [
      { title: 'num', field: 'c0' },
      { title: 'num', field: 'c1' },
      { title: 'num_2', field: 'c2' },
    ]
    const out = BeekeeperPlugin.cleanData({ c0: 1, c1: 2, c2: 3 }, cols)
    expect(out).toEqual({ num: 1, num_3: 2, num_2: 3 })
  })

  it('builds the key map once for all rows', () => {
    const spy = vi.spyOn(BeekeeperPlugin, 'jsonKeys')
    const ctx: any = { tableColumns, $bks: BeekeeperPlugin }
    const out = methods.dataToJson.call(ctx, [{ c0: 1, c1: 2, c2: 3 }, { c0: 4, c1: 5, c2: 6 }])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(out.map((r) => Object.values(r))).toEqual([[1, 2, 3], [4, 5, 6]])
    spy.mockRestore()
  })
})
