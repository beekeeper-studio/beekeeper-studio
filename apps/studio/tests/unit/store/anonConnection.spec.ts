import Vue from 'vue'
import { connectionToSave, historyConnectionIdFor, sessionConfigFor } from '@/store/anonConnection'

const saved: any = { id: 12, workspaceId: -1, name: 'Prod', anon: false }
const anon: any = { id: 7, workspaceId: -1, name: null, password: 'hunter2', anon: true }

describe('sessionConfigFor', () => {
  it('runs a saved connection as it is', async () => {
    const send = jest.fn()
    Vue.prototype.$util = { send }

    expect(await sessionConfigFor(saved)).toBe(saved)
    expect(send).not.toHaveBeenCalled()
  })

  it('keys a connection that was never saved on a local anonymous one', async () => {
    Vue.prototype.$util = { send: jest.fn().mockResolvedValue(7) }
    const config: any = { id: null, workspaceId: 5, password: 'hunter2' }

    expect(await sessionConfigFor(config)).toEqual({ id: 7, workspaceId: -1, password: 'hunter2', anon: true })
    expect(Vue.prototype.$util.send).toHaveBeenCalledWith('appdb/saved/createAnon', { config })
  })
})

describe('saving the session\'s connection', () => {
  it('saves a saved connection as it is', () => {
    expect(connectionToSave(saved, false)).toBe(saved)
    expect(connectionToSave(saved, true)).toBe(saved)
  })

  it('turns the anonymous connection into the saved one locally', () => {
    expect(connectionToSave(anon, false)).toEqual({ ...anon, anon: false })
  })

  // the anonymous connection is a local row, and a cloud upsert with its id
  // would update whichever cloud connection shares it
  it('saves a new connection to a cloud workspace', () => {
    const toSave = connectionToSave(anon, true)

    expect(toSave.id).toBeNull()
    expect(toSave).not.toHaveProperty('anon')
    expect(toSave.password).toBe('hunter2')
  })
})

describe('the connection query history is kept under', () => {
  it('is the session\'s connection', () => {
    expect(historyConnectionIdFor(saved, false)).toBe(12)
    expect(historyConnectionIdFor(saved, true)).toBe(12)
    expect(historyConnectionIdFor(anon, false)).toBe(7)
  })

  it('is nothing for an anonymous connection in a cloud workspace', () => {
    expect(historyConnectionIdFor(anon, true)).toBeNull()
  })

  it('is nothing without a session', () => {
    expect(historyConnectionIdFor(null, false)).toBeNull()
  })
})
