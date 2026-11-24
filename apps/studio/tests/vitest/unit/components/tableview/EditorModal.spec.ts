import { afterAll, beforeAll, expect, it, onTestFinished, vi } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import Vue from 'vue'
import VModal from 'vue-js-modal'
import EditorModal from '@/components/tableview/EditorModal.vue'

const localVue = createLocalVue()
localVue.use(VModal)
localVue.directive('kbd-trap', {})
const ignoredElements = Vue.config.ignoredElements
beforeAll(() => { Vue.config.ignoredElements = [...ignoredElements, /^x-/] })
afterAll(() => { Vue.config.ignoredElements = ignoredElements })

async function openCellEditor(isReadOnly = false) {
  const wrapper = mount(EditorModal, {
    localVue,
    stubs: {
      portal: { template: '<div><slot /></div>' },
      TextEditor: {
        props: ['value'],
        template: `<textarea :value="value" @input="$emit('bks-value-change', { value: $event.target.value })" />`,
      },
    },
  })
  onTestFinished(() => wrapper.destroy())

  const editor = wrapper.vm as Vue & {
    openModal(value: string, language: undefined, params: { isReadOnly: boolean }): void
  }
  editor.openModal('{"name":"original"}', undefined, { isReadOnly })
  await vi.waitFor(() => expect(wrapper.find('textarea').exists()).toBe(true))
  return wrapper
}

const draft = '{"name":"updated"}'

it.each([
  { action: 'Apply', saved: [draft] },
  { action: 'Cancel', saved: [] },
])('keeps edits after a backdrop click until $action', async ({ action, saved }) => {
  const wrapper = await openCellEditor()
  await wrapper.get('textarea').setValue(draft)

  // vue-js-modal handles backdrop presses on mousedown.
  const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  wrapper.get('.v--modal-background-click').element.dispatchEvent(press)
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  expect(press.defaultPrevented).toBe(true)
  expect(wrapper.get('textarea').element).toHaveProperty('value', draft)
  expect(wrapper.emitted('save')).toBeUndefined()

  const footer = wrapper.get('.vue-dialog-buttons')
  const buttons = footer.findAll('button, x-button').wrappers
  await buttons.find(button => button.text().includes(action))!.trigger('click')
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  expect((wrapper.emitted('save') ?? []).map(([value]) => value)).toEqual(saved)
})

it('closes a read-only cell viewer when its backdrop is pressed', async () => {
  const wrapper = await openCellEditor(true)
  await wrapper.get('.v--modal-background-click').trigger('mousedown')
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
})
