import { describe, it, expect } from 'vitest'
import { answerWindowRequest, askWindow } from '@/services/cliServer/windowRequests'

function fakePort() {
  const sent: any[] = []
  return { sent, postMessage: (message: unknown) => sent.push(message) }
}

describe('askWindow', () => {
  it('resolves with what the window answers to that request', async () => {
    const port = fakePort()
    const first = askWindow(port, 'cli/createTab', { tab: 'query' })
    const second = askWindow(port, 'cli/createTab', { tab: 'query' })
    expect(port.sent[0]).toMatchObject({ type: 'cli/createTab', input: { tab: 'query' } })

    answerWindowRequest({ requestId: port.sent[1].input.requestId, result: { tabId: '2' } })
    answerWindowRequest({ requestId: port.sent[0].input.requestId, result: { tabId: '1' } })
    await expect(first).resolves.toEqual({ tabId: '1' })
    await expect(second).resolves.toEqual({ tabId: '2' })
  })

  it('turns an error answer into a CliError with its code', async () => {
    const port = fakePort()
    const pending = askWindow(port, 'cli/switchTab', { tabId: '9' })
    answerWindowRequest({ requestId: port.sent[0].input.requestId, error: { code: 'NOT_FOUND', message: 'No open tab with id 9.' } })
    await expect(pending).rejects.toMatchObject({ name: 'CliError', code: 'NOT_FOUND', message: 'No open tab with id 9.' })
  })

  it('gives up when the window never answers, and ignores a late answer', async () => {
    const port = fakePort()
    await expect(askWindow(port, 'cli/switchTab', { tabId: '1' }, 10)).rejects.toMatchObject({ code: 'INTERNAL' })
    expect(() => answerWindowRequest({ requestId: port.sent[0].input.requestId, result: {} })).not.toThrow()
  })
})
