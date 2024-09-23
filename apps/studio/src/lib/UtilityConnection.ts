import { uuidv4 } from "./uuid";
import rawLog from 'electron-log';
import _ from 'lodash';

const log = rawLog.scope('UtilConnection');

type Listener = (input: any) => void;

export class UtilityConnection {
  private replyHandlers: Map<string, { resolve: any, reject: any }> = new Map();
  private listeners: Array<{type: string, id: string, listener: Listener}> = new Array();

  constructor(private port: MessagePort, private sId: string) {
    port.onmessage = (msg) => {
      const { data: msgData } = msg;
      log.info('RECEIVED MESSAGE: ', msgData.type, msgData)

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
      } else if (_.some(this.listeners, ({type}) => msgData.type === type)) {
        const { listener, type, id } = this.listeners.find(({type}) => msgData.type === type);
        log.info('HANDLING REQUEST WITH LISTENER (type, id): ', type, id);
        const { input } = msgData;
        listener(input);
      }
    }
  }

  public async send(handlerName: string, args: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      args = { sId: this.sId, ...args };
      const id = uuidv4();
      log.info('SENDING REQUEST FOR NAME, ID: ', handlerName, id)

      this.replyHandlers.set(id, { resolve, reject });

      this.port.postMessage({id, name: handlerName, args: args ?? {}});
    })
  }

  public addListener(type: string, listener: Listener): string {
    const id = uuidv4();
    this.listeners.push({ type, id, listener });
    log.info('ADDED LISTENER: ', type, id);

    return id;
  }

  public removeListener(id: string) {
    this.listeners = _.reject(this.listeners, { 'id': id });
  }
 
}
