import { createLocalVue, mount } from '@vue/test-utils'
import LicenseLapsedDialog from '@/components/license/LicenseLapsedDialog.vue'
import { listUsedPaidFeatures } from '@/lib/paidFeatures'

const localVue = createLocalVue()

function mountDialog(propsData: Record<string, any>) {
  const openLink = jest.fn()
  const wrapper = mount(LicenseLapsedDialog, {
    localVue,
    propsData: { title: 'Your free trial has ended', ...propsData },
    mocks: { $native: { openLink } },
    slots: { intro: 'The 14-day trial ended on 1/2/2026.' },
  })
  return { wrapper, openLink }
}

describe('LicenseLapsedDialog', () => {
  it('renders the title, intro, and the three ways forward', () => {
    const { wrapper } = mountDialog({})
    expect(wrapper.find('.dialog-c-title').text()).toBe('Your free trial has ended')
    expect(wrapper.text()).toContain('The 14-day trial ended on 1/2/2026.')
    expect(wrapper.text()).toContain('lifetime access')

    const buttons = wrapper.findAll('.license-lapsed-buttons .btn')
    expect(buttons.wrappers.map((b) => b.text())).toEqual([
      'Continue with the free version',
      'Ask your team',
      'Buy a license',
    ])
    expect(wrapper.find('.license-lapsed-features').exists()).toBe(false)
  })

  it('emits an event per action', async () => {
    const { wrapper } = mountDialog({})
    const buttons = wrapper.findAll('.license-lapsed-buttons .btn')
    await buttons.at(0).trigger('click')
    await buttons.at(1).trigger('click')
    await buttons.at(2).trigger('click')
    await wrapper.find('.license-lapsed-enter-key').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
    expect(wrapper.emitted('request')).toHaveLength(1)
    expect(wrapper.emitted('buy')).toHaveLength(1)
    expect(wrapper.emitted('enter-license')).toHaveLength(1)
  })

  it('lists the paid features that were used, capped with a count', () => {
    const usage: Record<string, any> = {}
    const ids = ['jsonViewer', 'editableQueryResults', 'importFromFile', 'multiTableExport', 'queryToFile', 'advancedFilters', 'folders', 'aiShell']
    ids.forEach((id, i) => {
      usage[id] = { firstUsedAt: new Date(2026, 0, i + 1).toISOString() }
    })
    const { wrapper } = mountDialog({ usedFeatures: listUsedPaidFeatures(usage) })

    const items = wrapper.findAll('.license-lapsed-features li')
    expect(items.length).toBe(7) // 6 features + the "and 2 more" row
    expect(items.at(0).text()).toContain('JSON row viewer')
    expect(items.at(6).text()).toContain('and 2 more')
  })

  it('opens the lifetime policy externally', async () => {
    const { wrapper, openLink } = mountDialog({})
    await wrapper.find('.license-lapsed-fact a').trigger('click')
    expect(openLink).toHaveBeenCalledWith(expect.stringContaining('lifetime-access'))
  })
})
