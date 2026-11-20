import { uuidv4 } from '@/lib/uuid'
import { CliError, CliErrorCode } from '@/cli/protocol'

export const WINDOW_ANSWER_TIMEOUT_MS = 4000

interface PortLike {
  postMessage(message: unknown): void
}

export interface WindowAnswer {
  requestId: string
  result?: unknown
  error?: { code?: CliErrorCode; message: string }
}

const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

/** Posts a message to an app window and waits for it to answer through answerWindowRequest. */
export function askWindow(
  port: PortLike,
  type: string,
  input: Record<string, unknown>,
  timeoutMs = WINDOW_ANSWER_TIMEOUT_MS
): Promise<unknown> {
  const requestId = uuidv4()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId)
      reject(new CliError('INTERNAL', `The app window did not answer within ${timeoutMs}ms.`))
    }, timeoutMs)
    pending.set(requestId, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })
    port.postMessage({ type, input: { ...input, requestId } })
  })
}

export function answerWindowRequest(answer: WindowAnswer): void {
  const request = pending.get(answer.requestId)
  if (!request) {
    return
  }
  pending.delete(answer.requestId)
  if (answer.error) {
    request.reject(new CliError(answer.error.code ?? 'INTERNAL', answer.error.message))
  } else {
    request.resolve(answer.result)
  }
}
