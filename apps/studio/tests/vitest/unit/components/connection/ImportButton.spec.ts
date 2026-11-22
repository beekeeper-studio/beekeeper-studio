import { describe, it, expect, vi } from "vitest";
import { shallowMount } from '@vue/test-utils'
import ImportButton from '@/components/connection/ImportButton.vue'

function mountButton(config: any, parsed: any) {
  const hide = vi.fn()
  const wrapper = shallowMount(ImportButton as any, {
    propsData: { config },
    stubs: { portal: true, modal: true },
    directives: { 'kbd-trap': {} },
    mocks: {
      $modal: { show: vi.fn(), hide },
      $util: {
        send: async (channel: string) => {
          if (channel !== 'appdb/saved/parseUrl' || !parsed) throw new Error('unable to parse')
          return parsed
        },
      },
    },
  })
  return { wrapper: wrapper as any, hide }
}

describe('ImportButton', () => {
  it('copies the parsed url onto the config and tells the parent about it', async () => {
    const config: any = { connectionType: null, host: 'localhost', port: null }
    const parsed = { connectionType: 'postgresql', host: 'dbhost.example.com', port: 15432, defaultDatabase: 'analytics' }
    const { wrapper, hide } = mountButton(config, parsed)
    wrapper.setData({ url: 'postgresql://dbhost.example.com:15432/analytics' })

    await wrapper.vm.importFromUrl()

    expect(config).toMatchObject(parsed)
    // ConnectionInterface relies on this to keep a url without credentials
    expect(wrapper.emitted('imported')).toEqual([[parsed]])
    expect(hide).toHaveBeenCalledWith('import-modal')
    expect(wrapper.vm.importError).toBeNull()
  })

  it('reports a url that cannot be parsed and emits nothing', async () => {
    const config: any = { connectionType: null }
    const { wrapper, hide } = mountButton(config, null)
    wrapper.setData({ url: 'postgresql://user:100%safe@localhost/db' })

    await wrapper.vm.importFromUrl()

    expect(wrapper.vm.importError).toBe('Unable to parse url')
    expect(wrapper.emitted('imported')).toBeUndefined()
    expect(hide).not.toHaveBeenCalled()
  })
})
