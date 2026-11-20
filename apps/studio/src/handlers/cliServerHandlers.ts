import { answerWindowRequest, WindowAnswer } from '@/services/cliServer/windowRequests'

export interface ICliServerHandlers {
  'cliServer/answer': (answer: WindowAnswer & { sId: string }) => Promise<void>
}

/** App windows answer the CLI server's requests through these. */
export const CliServerHandlers: ICliServerHandlers = {
  'cliServer/answer': async function({ requestId, result, error }) {
    answerWindowRequest({ requestId, result, error })
  },
}
