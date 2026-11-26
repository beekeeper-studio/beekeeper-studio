import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { TabulatorFull } from 'tabulator-tables'
import NullableInputEditor from '@shared/components/tabulator/NullableInputEditor.vue'

/**
 * The editor's input inside a table that keeps Tabulator's default
 * keybindings, like the structure tabs (columns, relations, indexes).
 * jsdom does not lay out rows, so the editor goes straight into the table
 * element, where Tabulator listens for its keybindings.
 */
async function inputInTable() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const table = new TabulatorFull(el, {
    data: [],
    columns: [{ field: 'comment', title: 'comment' }],
  })
  await new Promise((resolve) => table.on('tableBuilt', resolve))

  const wrapper = mount(NullableInputEditor, {
    propsData: { cell: { getValue: () => 'a comment' }, params: {} },
  })
  el.appendChild(wrapper.element)

  const cleanup = () => {
    wrapper.destroy()
    table.destroy()
    el.remove()
  }
  return { input: wrapper.find('input').element as HTMLInputElement, cleanup }
}

// #3172: Home and End did nothing in the column comment input, because
// Tabulator's scrollToStart and scrollToEnd keybindings called
// preventDefault on the key press.
describe('NullableInputEditor', () => {
  it.each([
    ['Home', 36],
    ['End', 35],
  ])('leaves %s to the input', async (key, keyCode) => {
    const { input, cleanup } = await inputInTable()

    const event = new KeyboardEvent('keydown', { key, keyCode, bubbles: true, cancelable: true })
    input.dispatchEvent(event)
    cleanup()

    expect(event.defaultPrevented).toBe(false)
  })
})
