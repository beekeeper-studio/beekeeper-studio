import { describe, it, expect, vi } from 'vitest'
import { createLocalVue, mount } from '@vue/test-utils'
import BaseModal from '@/components/common/modals/BaseModal.vue'

// vue-js-modal renders nothing until $modal.show(); a pass-through stub keeps
// the dialog markup in the DOM and exposes the click-to-close prop.
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

// Renders BaseModal with a body and a footer button wired to the scoped
// `close` slot prop, the way the app's dialogs use it.
const Host = {
  props: ['closable'],
  render(h) {
    return h(
      BaseModal,
      {
        props: { name: 'test-modal', closable: this.closable },
        scopedSlots: {
          footer: (props: any) =>
            h('button', { class: 'footer-close', attrs: { type: 'button' }, on: { click: () => props.close() } }, 'Done'),
        },
      },
      [h('p', { class: 'body' }, 'Body')]
    )
  },
}

function mountHost(propsData: Record<string, any> = {}) {
  const localVue = createLocalVue()
  localVue.directive('kbd-trap', {})
  const $modal = { show: vi.fn(), hide: vi.fn() }
  const wrapper = mount(Host, {
    localVue,
    propsData,
    stubs: { modal: ModalStub, portal: PortalStub },
    mocks: { $modal },
  })
  return { wrapper, $modal, modalStub: wrapper.findComponent(ModalStub) }
}

describe('BaseModal', () => {
  it('is closable by default: close button, overlay click, and before-close left alone', async () => {
    const { wrapper, $modal, modalStub } = mountHost()

    expect(wrapper.find('.body').text()).toBe('Body')
    expect(wrapper.find('.base-modal-close').exists()).toBe(true)
    expect(modalStub.attributes('data-click-to-close')).toBe('true')

    const stop = vi.fn()
    modalStub.vm.$emit('before-close', { stop })
    expect(stop).not.toHaveBeenCalled()

    await wrapper.find('.footer-close').trigger('click')
    expect($modal.hide).toHaveBeenCalledWith('test-modal')
    wrapper.destroy()
  })

  it('when not closable, blocks every escape route but an explicit close()', async () => {
    const { wrapper, $modal, modalStub } = mountHost({ closable: false })

    expect(wrapper.find('.base-modal-close').exists()).toBe(false)
    expect(modalStub.attributes('data-click-to-close')).toBe('false')

    // Escape, overlay clicks and stray $modal.hide calls all arrive as
    // before-close and get stopped
    const stop = vi.fn()
    modalStub.vm.$emit('before-close', { stop })
    expect(stop).toHaveBeenCalledTimes(1)

    // an explicit close() lets the before-close raised by the hide through...
    const duringClose = vi.fn()
    $modal.hide.mockImplementation(() => modalStub.vm.$emit('before-close', { stop: duringClose }))
    await wrapper.find('.footer-close').trigger('click')
    expect($modal.hide).toHaveBeenCalledWith('test-modal')
    expect(duringClose).not.toHaveBeenCalled()

    // ...and only that one: the next escape attempt is stopped again
    const afterClose = vi.fn()
    modalStub.vm.$emit('before-close', { stop: afterClose })
    expect(afterClose).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })
})
