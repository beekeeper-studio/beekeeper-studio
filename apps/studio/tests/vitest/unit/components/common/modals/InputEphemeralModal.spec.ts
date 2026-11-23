import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import InputEphemeralModal from '@/components/common/modals/InputEphemeralModal.vue'

// BaseModal stub
const BaseModalStub = {
  template: `
    <div class="base-modal-stub">
      <div class="modal-title"><slot name="title" /></div>
      <div class="modal-body"><slot /></div>
      <div class="modal-footer"><slot name="footer" /></div>
    </div>
  `
}

const PortalStub = {
  template: '<div><slot /></div>'
}

describe('InputEphemeralModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default text input and renders given title and description', async () => {
    const wrapper = mount(InputEphemeralModal, {
      propsData: { name: 'test-modal' },
      stubs: {
        BaseModal: BaseModalStub,
        portal: PortalStub,
        ErrorAlert: true
      }
    })

    const vm = wrapper.vm as any
    vm.beforeOpen({
      params: {
        title: 'CockroachDB JWT',
        description: 'Paste a fresh token',
      }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Input CockroachDB JWT')
    expect(wrapper.text()).toContain('Paste a fresh token')
    const input = wrapper.find('input#input-ephemeral')
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('text')
  })

  it('supports password inputType and toggling password visibility', async () => {
    const wrapper = mount(InputEphemeralModal, {
      propsData: { name: 'test-modal' },
      stubs: {
        BaseModal: BaseModalStub,
        portal: PortalStub,
        ErrorAlert: true
      }
    })

    const vm = wrapper.vm as any
    vm.beforeOpen({
      params: {
        title: 'Password / Token',
        modalTitle: 'Update Password',
        description: 'Enter your new database password or token',
        inputType: 'password',
        placeholder: 'Enter new password or token',
        buttonLabel: 'Reconnect',
      }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Update Password')
    expect(wrapper.text()).toContain('Enter your new database password or token')

    const input = wrapper.find('input#input-ephemeral')
    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('placeholder')).toBe('Enter new password or token')

    // Find visibility icon and click
    const icon = wrapper.find('.password-icon')
    expect(icon.exists()).toBe(true)
    expect(icon.text()).toBe('visibility')

    await icon.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(icon.text()).toBe('visibility_off')

    await icon.trigger('click')
    expect(input.attributes('type')).toBe('password')
  })

  it('invokes onSubmit listener on submit with value', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    const wrapper = mount(InputEphemeralModal, {
      propsData: { name: 'test-modal' },
      stubs: {
        BaseModal: BaseModalStub,
        portal: PortalStub,
        ErrorAlert: true
      },
      mocks: {
        $modal: { hide: vi.fn() }
      }
    })

    const vm = wrapper.vm as any
    vm.beforeOpen({
      params: {
        title: 'Password',
        onSubmit,
        onCancel,
      }
    })
    await wrapper.vm.$nextTick()

    // Empty submit displays error
    await vm.submit()
    expect(vm.errorMessage).toContain('Please input a Password')
    expect(onSubmit).not.toHaveBeenCalled()

    // Submit with value
    vm.value = 'super-secret-token'
    await vm.submit()
    expect(vm.submitting).toBe(true)

    vm.closed()
    expect(onSubmit).toHaveBeenCalledWith('super-secret-token')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('invokes onCancel listener when closed without submitting', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    const wrapper = mount(InputEphemeralModal, {
      propsData: { name: 'test-modal' },
      stubs: {
        BaseModal: BaseModalStub,
        portal: PortalStub,
        ErrorAlert: true
      },
      mocks: {
        $modal: { hide: vi.fn() }
      }
    })

    const vm = wrapper.vm as any
    vm.beforeOpen({
      params: {
        title: 'Password',
        onSubmit,
        onCancel,
      }
    })
    await wrapper.vm.$nextTick()

    vm.close()
    vm.closed()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })
})
