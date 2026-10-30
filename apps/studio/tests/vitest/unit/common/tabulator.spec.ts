import { tabulatorForTableInfo } from '@/common/tabulator'

// Regression coverage for #3172: Home/End did nothing in the column, relation
// and index name/comment editors.
describe('tabulatorForTableInfo', () => {
  let el: HTMLElement

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => el.remove())

  // Cell editors are inputs inside the table element, which is where
  // Tabulator listens for its keybindings.
  function pressInTableInput(key: string) {
    const table = tabulatorForTableInfo(el, {
      data: [{ comment: 'hello' }],
      columns: [{ field: 'comment', editor: 'input' }],
    })
    return new Promise<KeyboardEvent>((resolve) => {
      table.on('tableBuilt', () => {
        const input = document.createElement('input')
        el.appendChild(input)
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        input.dispatchEvent(event)
        table.destroy()
        resolve(event)
      })
    })
  }

  it.each(['Home', 'End'])('does not swallow %s inside the table', async (key) => {
    const event = await pressInTableInput(key)
    expect(event.defaultPrevented).toBe(false)
  })
})
