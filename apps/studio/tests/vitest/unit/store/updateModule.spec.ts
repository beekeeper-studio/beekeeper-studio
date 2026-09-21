import { describe, it, expect, vi, beforeEach } from 'vitest'
import Vue from 'vue'
import Vuex from 'vuex'
import { UpdateModule } from '@/store/modules/UpdateModule'

Vue.use(Vuex)

function makeStore() {
  return new Vuex.Store({ modules: { updates: UpdateModule } })
}

describe('UpdateModule', () => {
  beforeEach(() => {
    window.main = {
      triggerDownload: vi.fn(),
      triggerInstall: vi.fn(),
    } as any
  })

  it('starts with nothing to say', () => {
    const store = makeStore()
    expect(store.getters['updates/pending']).toBe(false)
    expect(store.state.updates.version).toBe(null)
  })

  it('records the offered version', () => {
    const store = makeStore()
    store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })

    expect(store.getters['updates/pending']).toBe(true)
    expect(store.state.updates.stage).toEqual('available')
    expect(store.state.updates.version).toEqual('6.2.0')
  })

  it('copes with an updater that gives no version', () => {
    const store = makeStore()
    store.dispatch('updates/found', { stage: 'available' })

    expect(store.getters['updates/pending']).toBe(true)
    expect(store.state.updates.version).toBe(null)
  })

  it('stays dismissed when the same update is announced again', () => {
    // the updater re-checks on an interval, so the same news arrives repeatedly
    const store = makeStore()
    store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })
    store.dispatch('updates/dismiss')

    store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })

    expect(store.getters['updates/pending']).toBe(false)
  })

  it('speaks up again for a newer version', () => {
    const store = makeStore()
    store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })
    store.dispatch('updates/dismiss')

    store.dispatch('updates/found', { stage: 'available', version: '6.3.0' })

    expect(store.getters['updates/pending']).toBe(true)
    expect(store.state.updates.version).toEqual('6.3.0')
  })

  it('speaks up again once the download has landed', () => {
    const store = makeStore()
    store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })
    store.dispatch('updates/dismiss')

    store.dispatch('updates/found', { stage: 'downloaded', version: '6.2.0' })

    expect(store.getters['updates/pending']).toBe(true)
  })

  it('downloads through the main process and moves on to downloading', () => {
    const store = makeStore()
    store.dispatch('updates/found', { stage: 'available', version: '6.2.0' })

    store.dispatch('updates/download')

    expect(window.main.triggerDownload).toHaveBeenCalled()
    expect(store.state.updates.stage).toEqual('downloading')
  })

  it('installs through the main process', () => {
    const store = makeStore()
    store.dispatch('updates/found', { stage: 'downloaded', version: '6.2.0' })

    store.dispatch('updates/install')

    expect(window.main.triggerInstall).toHaveBeenCalled()
  })
})
