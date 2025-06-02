import { mount } from '@vue/test-utils'
import ColumnFilterModal from '@/components/tableview/ColumnFilterModal.vue'

describe('ColumnFilterModal', () => {
  it('open the context menu by right clicking the filter bar', async () => {
    const wrapper = mount(ColumnFilterModal, {
      propsData: {
        modalName: 'test-modal',
        columnsWithFilterAndOrder: [],
        hasPendingChanges: false,
      },
      global: {
        stubs: ['portal', 'modal', 'x-button', 'ContextMenu'],
        directives: {
          tooltip: {},
          'kbd-trap': {},
        },
        mocks: {
          $modal: { show: jest.fn(), hide: jest.fn() }
        }
      }
    })

    const input = wrapper.find('input[type="text"]')
    await input.trigger('contextmenu', { button: 2 })

    expect(wrapper.vm.showContextMenu).toBe(true)
    expect(wrapper.findComponent({ name: 'ContextMenu' }).exists()).toBe(true)
  })
})