import { describe, it, expect, vi } from 'vitest'
import { handleSqlServerHostPaste } from '@/components/connection/sqlServerHostPaste'

function pasteEvent(text: string, input: Partial<HTMLInputElement> = {}) {
  return {
    target: { value: '', selectionStart: 0, selectionEnd: 0, readOnly: false, disabled: false, ...input },
    clipboardData: { getData: () => text },
    preventDefault: vi.fn(),
  } as any
}

describe('handleSqlServerHostPaste', () => {
  it('moves a pasted port into the Port field', () => {
    const config = { connectionType: 'sqlserver', host: '', port: 1433 }
    const event = pasteEvent('tcp:myserver.database.windows.net,3342')

    expect(handleSqlServerHostPaste(event, config)).toBe(true)
    expect(config).toMatchObject({ host: 'myserver.database.windows.net', port: 3342 })
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('replaces the selected text, as the paste itself would', () => {
    const config = { connectionType: 'sqlserver', host: 'localhost', port: 1433 }
    const event = pasteEvent('db\\SQL2019,14330', { value: 'localhost', selectionStart: 0, selectionEnd: 9 })

    handleSqlServerHostPaste(event, config)
    expect(config).toMatchObject({ host: 'db\\SQL2019', port: 14330 })
  })

  it('lets a paste without a port through untouched', () => {
    const config = { connectionType: 'sqlserver', host: '', port: 1433 }
    const event = pasteEvent('db.example.com')

    expect(handleSqlServerHostPaste(event, config)).toBe(false)
    expect(config).toEqual({ connectionType: 'sqlserver', host: '', port: 1433 })
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('does nothing for other connection types', () => {
    const config = { connectionType: 'postgresql', host: '', port: 5432 }
    const event = pasteEvent('db.example.com,1433')

    expect(handleSqlServerHostPaste(event, config)).toBe(false)
    expect(config.port).toBe(5432)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('does nothing while the field is read-only (privacy mode)', () => {
    const config = { connectionType: 'sqlserver', host: 'secret', port: 1433 }
    const event = pasteEvent('db.example.com,3342', { readOnly: true })

    expect(handleSqlServerHostPaste(event, config)).toBe(false)
    expect(config).toMatchObject({ host: 'secret', port: 1433 })
  })
})

import { mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuex from 'vuex'
import CommonServerInputs from '@/components/connection/CommonServerInputs.vue'
import CommonEntraId from '@/components/connection/CommonEntraId.vue'
import { AzureAuthType } from '@/lib/db/types'

Vue.use(Vuex)
Vue.directive('tooltip', {})

function store() {
  return new Vuex.Store({
    state: { connection: { azureGetAccountName: vi.fn() } },
    modules: { settings: { namespaced: true, getters: { privacyMode: () => false } } },
  })
}

function paste(wrapper: any, selector: string, text: string) {
  const input = wrapper.find(selector)
  const event: any = new Event('paste', { bubbles: true, cancelable: true })
  event.clipboardData = { getData: () => text }
  input.element.dispatchEvent(event)
  return event
}

// The same handler, reached through the real inputs.
describe('pasting host,port into the SQL Server forms', () => {
  it('fills Host and Port on the username/password form', async () => {
    const config = Vue.observable({ connectionType: 'sqlserver', host: '', port: 1433, username: '', password: '', ssl: false })
    const wrapper = mount(CommonServerInputs, {
      store,
      propsData: { config },
      stubs: { CommonSsl: true, PasswordInput: true },
    } as any)

    const event = paste(wrapper, '.col.s9 input', 'tcp:db.example.com,14330')
    await Vue.nextTick()

    expect(event.defaultPrevented).toBe(true)
    expect(config.host).toBe('db.example.com')
    expect(config.port).toBe(14330)
    expect((wrapper.find('.col.s9 input').element as HTMLInputElement).value).toBe('db.example.com')
    wrapper.destroy()
  })

  it('fills Server and Port on the Entra ID form', async () => {
    const config = Vue.observable({
      connectionType: 'sqlserver', host: '', port: 1433, username: '', defaultDatabase: '',
      azureAuthOptions: { azureAuthEnabled: true, azureAuthType: AzureAuthType.ServicePrincipalSecret },
    })
    const wrapper = mount(CommonEntraId, {
      store,
      propsData: { config, authType: AzureAuthType.ServicePrincipalSecret },
      stubs: { CliPathPicker: true, PasswordInput: true },
    } as any)

    paste(wrapper, 'input.form-control', 'tcp:myserver.database.windows.net,3342')
    await Vue.nextTick()

    expect(config.host).toBe('myserver.database.windows.net')
    expect(config.port).toBe(3342)
    wrapper.destroy()
  })
})
