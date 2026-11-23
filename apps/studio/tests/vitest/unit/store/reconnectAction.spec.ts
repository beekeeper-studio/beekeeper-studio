import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Vue from 'vue'
import store from '@/store'
import { BeekeeperPlugin } from '@/plugins/BeekeeperPlugin'

const sent: { channel: string; args?: any }[] = []
let sendImpl: (channel: string, args?: any) => Promise<any>

function stubConnectionClient(overrides: Record<string, any> = {}) {
  Object.assign(store.state.connection, {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    ...overrides,
  })
}

const CONFIG: any = {
  connectionType: 'postgresql',
  defaultDatabase: 'mydb',
  workspaceId: -1,
  id: 10,
  password: 'old-token'
}

describe('store reconnect action with password update', () => {
  beforeEach(() => {
    sent.length = 0
    sendImpl = async () => undefined

    Vue.prototype.$util = {
      send: (channel: string, args?: any) => {
        sent.push({ channel, args })
        return sendImpl(channel, args)
      }
    }

    Vue.prototype.$noty = {
      info: vi.fn(() => ({
        setText: vi.fn(),
        setType: vi.fn(),
        setTimeout: vi.fn(),
        close: vi.fn(),
      })),
      success: vi.fn(),
      error: vi.fn(),
    }

    store.commit('clearConnection')
    store.commit('newConnection', { ...CONFIG })

    stubConnectionClient()

    store.registerModule('data/connections', {
      namespaced: true,
      state: {
        items: [{ ...CONFIG }]
      },
      actions: {
        save: vi.fn(async ({ state }, updated) => {
          const idx = state.items.findIndex(c => c.id === updated.id)
          if (idx >= 0) state.items[idx] = updated
        })
      }
    } as any, { preserveState: false })
  })

  afterEach(() => {
    store.unregisterModule('data/connections')
    store.commit('clearConnection')
    vi.restoreAllMocks()
  })

  it('reconnects cleanly when connection.connect succeeds', async () => {
    const res = await store.dispatch('reconnect')
    expect(res).toBe(true)
    expect(store.state.connection.connect).toHaveBeenCalled()
  })

  it('prompts for new password on authentication failure and reconnects with updated token', async () => {
    let connectAttempts = 0
    store.state.connection.connect = vi.fn(async () => {
      connectAttempts++
      if (connectAttempts === 1) {
        throw new Error('Database Connection Error: password authentication failed for user "databricks"')
      }
      return undefined
    })

    // Mock promptConnectionPassword
    vi.spyOn(BeekeeperPlugin, 'promptConnectionPassword').mockResolvedValue({
      password: 'new-fresh-oauth-token',
      cancelled: false
    })

    const res = await store.dispatch('reconnect')

    expect(res).toBe(true)
    expect(connectAttempts).toBe(2)
    expect(BeekeeperPlugin.promptConnectionPassword).toHaveBeenCalled()

    // Backend received conn/updatePassword
    const updatePasswordMsg = sent.find(s => s.channel === 'conn/updatePassword')
    expect(updatePasswordMsg).toBeDefined()
    expect(updatePasswordMsg?.args?.password).toBe('new-fresh-oauth-token')

    // State usedConfig updated
    expect(store.state.usedConfig?.password).toBe('new-fresh-oauth-token')

    // Saved connection in data/connections updated
    const saved = store.state['data/connections'].items.find(c => c.id === CONFIG.id)
    expect(saved?.password).toBe('new-fresh-oauth-token')
  })

  it('handles cancellation when prompted for password on auth error', async () => {
    store.state.connection.connect = vi.fn(async () => {
      throw new Error('password authentication failed')
    })

    vi.spyOn(BeekeeperPlugin, 'promptConnectionPassword').mockResolvedValue({
      cancelled: true
    })

    await expect(store.dispatch('reconnect')).rejects.toThrow('password authentication failed')

    expect(BeekeeperPlugin.promptConnectionPassword).toHaveBeenCalled()
    // Noty error is displayed with Update Password button
    expect(Vue.prototype.$noty.error).toHaveBeenCalled()
  })

  it('updateConnectionPassword dispatches conn/updatePassword and updates saved connection', async () => {
    await store.dispatch('updateConnectionPassword', 'brand-new-pass')

    const updatePasswordMsg = sent.find(s => s.channel === 'conn/updatePassword')
    expect(updatePasswordMsg?.args?.password).toBe('brand-new-pass')
    expect(store.state.usedConfig?.password).toBe('brand-new-pass')

    const saved = store.state['data/connections'].items.find(c => c.id === CONFIG.id)
    expect(saved?.password).toBe('brand-new-pass')
  })
})
