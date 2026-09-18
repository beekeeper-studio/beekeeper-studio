import { describe, it, expect, vi } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import ConfirmationModal from '@/components/common/modals/ConfirmationModal.vue'
import { AppEventMixin } from '@/common/AppEvent'
import { MODAL_CLOSE_EVENT } from '@/components/common/modals/utils'

// vue-js-modal renders nothing until $modal.show(); pass-through stubs keep
// the dialog markup in the DOM so the assertions can see it.
const ModalStub = {
  props: ['name', 'clickToClose'],
  render(h) {
    return h(
      'div',
      { class: 'modal-stub', attrs: { 'data-click-to-close': String(this.clickToClose) } },
      this.$slots.default
    )
  },
}
const PortalStub = {
  render(h) {
    return h('div', this.$slots.default)
  },
}

function mountModal(propsData: Record<string, any> = {}) {
  const localVue = createLocalVue()
  localVue.mixin(AppEventMixin)
  localVue.directive('kbd-trap', {})
  const $modal = { show: vi.fn(), hide: vi.fn() }
  const wrapper = mount(ConfirmationModal, {
    localVue,
    propsData: { id: 'test-confirm', ...propsData },
    stubs: { modal: ModalStub, portal: PortalStub },
    mocks: { $modal },
  })
  const closeEvents: any[] = []
  wrapper.vm.$root.$on(MODAL_CLOSE_EVENT, (data: any) => closeEvents.push(data))
  return { wrapper, $modal, closeEvents }
}

describe('ConfirmationModal', () => {
  it('confirms and cancels straight away when no acknowledgement is required', async () => {
    const { wrapper, $modal, closeEvents } = mountModal()

    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBeUndefined()
    await wrapper.find('form').trigger('submit')
    expect(closeEvents).toEqual([{ modalId: 'test-confirm', confirmed: true }])
    expect($modal.hide).toHaveBeenCalledWith('test-confirm')

    await wrapper.find('button[type=button]').trigger('click')
    expect(closeEvents[1]).toEqual({ modalId: 'test-confirm', confirmed: false })
    wrapper.destroy()
  })

  it('keeps the confirm button disabled until the acknowledgement is ticked', async () => {
    const { wrapper, $modal, closeEvents } = mountModal({
      acknowledgement: 'I understand that this cannot be undone',
    })

    expect(wrapper.find('.confirmation-acknowledgement').text()).toContain('I understand that this cannot be undone')
    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBe('disabled')

    // a submit while unacknowledged is a no-op
    await wrapper.find('form').trigger('submit')
    expect(closeEvents).toEqual([])
    expect($modal.hide).not.toHaveBeenCalled()

    await wrapper.find('input[type=checkbox]').setChecked(true)
    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    expect(closeEvents).toEqual([{ modalId: 'test-confirm', confirmed: true }])
    expect($modal.hide).toHaveBeenCalledWith('test-confirm')
    wrapper.destroy()
  })

  it('renders the item list with badges, notes and highlights', () => {
    const { wrapper } = mountModal({
      items: [
        { label: 'JSON row view', badge: 'Used', note: 'Last used 2 days ago', highlight: true },
        'Import from file',
      ],
    })

    const rows = wrapper.findAll('.confirmation-item')
    expect(rows).toHaveLength(2)
    expect(rows.at(0).classes()).toContain('confirmation-item--highlight')
    expect(rows.at(0).find('.confirmation-item-label').text()).toBe('JSON row view')
    expect(rows.at(0).find('.confirmation-item-badge').text()).toBe('Used')
    expect(rows.at(0).find('.confirmation-item-note').text()).toBe('Last used 2 days ago')
    expect(rows.at(1).classes()).not.toContain('confirmation-item--highlight')
    expect(rows.at(1).text()).toBe('Import from file')
    expect(rows.at(1).find('.confirmation-item-badge').exists()).toBe(false)
    wrapper.destroy()
  })

  it('is closable by default: close button present, overlay click allowed, before-close not stopped', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('.base-modal-close').exists()).toBe(true)
    expect(wrapper.find('.modal-stub').attributes('data-click-to-close')).toBe('true')

    const stop = vi.fn()
    wrapper.findComponent(ModalStub).vm.$emit('before-close', { stop })
    expect(stop).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('locks down when not closable, but still closes on an explicit button press', async () => {
    const { wrapper, $modal } = mountModal({ closable: false })

    expect(wrapper.find('.base-modal-close').exists()).toBe(false)
    expect(wrapper.find('.modal-stub').attributes('data-click-to-close')).toBe('false')

    // Escape / overlay / stray $modal.hide all arrive as before-close: stopped
    const stop = vi.fn()
    wrapper.findComponent(ModalStub).vm.$emit('before-close', { stop })
    expect(stop).toHaveBeenCalledTimes(1)

    // an explicit cancel goes through BaseModal.close(), which lets it pass
    await wrapper.find('button[type=button]').trigger('click')
    expect($modal.hide).toHaveBeenCalledWith('test-confirm')
    wrapper.destroy()
  })
})
