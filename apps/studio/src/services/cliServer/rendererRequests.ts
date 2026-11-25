import { CliError, CliErrorCode } from '@beekeeperstudio/cli'

/** What the approval dialog shows. */
export interface CliAccessRequest {
  clientName: string
  connectionName: string
  readOnlyMode: boolean
}

export interface RendererResponse {
  requestId: string
  result?: unknown
  error?: { code?: CliErrorCode; message: string }
}

/** Requests posted to renderers, settled by respondRendererRequest when the renderer replies. */
export const pendingRendererRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

export function respondRendererRequest(response: RendererResponse): void {
  const request = pendingRendererRequests.get(response.requestId)
  if (!request) {
    return
  }
  pendingRendererRequests.delete(response.requestId)
  if (response.error) {
    request.reject(new CliError(response.error.code ?? 'INTERNAL', response.error.message))
  } else {
    request.resolve(response.result)
  }
}
