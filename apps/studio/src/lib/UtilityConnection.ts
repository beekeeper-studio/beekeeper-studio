import { uuidv4 } from "./uuid";
import rawLog from 'electron-log';

const log = rawLog.scope('UtilConnection');


export class UtilityConnection {
  replyHandlers: Map<string, { resolve: any, reject: any }> = new Map();

  constructor(private port: MessagePort) {
    port.onmessage = (msg) => {
      const { data: msgData } = msg;

      if (msgData.type === 'error') {
        // handle errors
        const { id, error } = msgData;

        const handler = this.replyHandlers.get(id);
        if (handler) {
          log.error('GOT ERROR BACK FOR REQUEST ID: ', id);
          this.replyHandlers.delete(id);
          handler.reject(error);
        }
      } else if (msgData.type === 'reply') {
        const { id, data } = msgData;

        const handler = this.replyHandlers.get(id);
        if (handler) {
          log.info('RECEIVED REPLY FOR REQUEST ID: ', id);
          this.replyHandlers.delete(id);

          handler.resolve(data);
        }
      }
    }
  }

  public async send(handlerName: string, args: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const id = uuidv4();
      log.info('SENDING REQUEST FOR NAME, ID: ', handlerName, id)

      this.replyHandlers.set(id, { resolve, reject });

      this.port.postMessage({id, name: handlerName, args: args ?? {}});
    })
  }
}
