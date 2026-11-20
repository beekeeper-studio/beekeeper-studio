import { respondRendererRequest, RendererResponse } from '@/services/cliServer/rendererRequests'

export interface ICliServerHandlers {
  'cliServer/respond': (response: RendererResponse & { sId: string }) => Promise<void>
}

/** Renderers respond to the CLI server's requests through these. */
export const CliServerHandlers: ICliServerHandlers = {
  'cliServer/respond': async function({ requestId, result, error }) {
    respondRendererRequest({ requestId, result, error })
  },
}
