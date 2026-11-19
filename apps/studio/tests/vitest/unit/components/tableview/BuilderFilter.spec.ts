import { mount } from '@vue/test-utils'
import { expect, it, onTestFinished } from 'vitest'
import Vue from 'vue'
import BuilderFilter from '@/components/tableview/filter/BuilderFilter.vue'

it('finds columns by substring and selects the original name without submitting the filter', async () => {
  const columns = ['id', 'shipping_address', 'Billing_Address'].map(columnName => ({ columnName }))
  const filter = Vue.observable({ field: 'id', type: '=', value: 'Main Street' })
  const wrapper = mount(BuilderFilter, {
    attachTo: document.body,
    propsData: { columns, filter, index: 1 },
    mocks: { $store: { state: { supportedFeatures: {} } } },
  })
  onTestFinished(() => wrapper.destroy())

  const search = wrapper.get('input[type="search"]')
  await search.trigger('focus')
  await search.setValue('aDdR')
  const options = document.querySelectorAll('[role="listbox"] [role="option"]')
  expect(Array.from(options, option => option.textContent.trim())).toEqual(['shipping_address', 'Billing_Address'])
  expect(wrapper.emitted('changed')).toBeUndefined()

  await search.trigger('keydown', { key: 'ArrowDown', keyCode: 40 })
  const enter = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true })
  search.element.dispatchEvent(enter)
  await Vue.nextTick()

  expect(enter.defaultPrevented).toBe(true)
  expect(wrapper.emitted('changed')).toEqual([[1, { field: 'Billing_Address', type: '=', value: 'Main Street' }]])
})
