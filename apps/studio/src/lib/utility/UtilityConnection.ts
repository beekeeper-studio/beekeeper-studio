import { uuidv4 } from "../uuid";
import rawLog from '@bksLogger';
import _ from 'lodash';

const log = rawLog.scope('renderer/utilityconnection');

type Listener = (input: any) => void;
type Message = {
  handlerName: string,
  args: any,
  id: string,
  resolve: any,
  reject: any
}


export class UtilityConnection {
  private replyHandlers: Map<string, { resolve: any, reject: any }> = new Map();
  private listeners: Array<{type: string, id: string, listener: Listener}> = new Array();
  private messageQueue: Array<Message> = new Array();
  private port: MessagePort;
  private _sId: string;
  private portsRequested: boolean = false;

  public get sId() {
    return this._sId;
  } 

  public async hasWorkingPort(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.port) reject();
      const id = uuidv4();
      this.replyHandlers.set(id, {resolve, reject});
      this.port.postMessage({name: test})
    })
  }

  public setPort(port: MessagePort, sId: string) {
    this.port = port;
    this._sId = sId;
    log.info('RECEIVED PORT IN UtilityConnection: ', port);
    this.port.onmessage = (msg) => {
      const { data: msgData } = msg;

      if (msgData.type === 'error') {
        // handle errors
        const { id, error, stack } = msgData;

        const handler = this.replyHandlers.get(id);
        if (handler) {
          log.error('GOT ERROR BACK FOR REQUEST ID: ', id);
          this.replyHandlers.delete(id);
          const err = new Error(error);
          err.stack = stack;
          handler.reject(err);
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
      } else {
        log.info('RECEIVED UNRECOGNIZED MESSAGE: ', msgData.type, msgData)
      }
    }

    this.port.start();

    if (this.messageQueue.length > 0) {
      this.messageQueue.forEach(({ handlerName, args, id, resolve, reject }) => {
        log.info('PROCESSING QUEUED REQUEST: ', handlerName, id);
        args = { sId: this._sId, ...args };
        this.replyHandlers.set(id, { resolve, reject });
        this.port.postMessage({ id, name: handlerName, args: args ?? {}})
      });
      this.messageQueue = [];
    }
  }

  public async send(handlerName: string, args: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const id = uuidv4();

      if (!this.port) {
        log.info('QUEUEING REQUEST FOR NAME, ID: ', handlerName, id);
        this.messageQueue.push({ handlerName, args, id, resolve, reject });
        if (!this.portsRequested) {
          window.main.requestPorts();
          this.portsRequested = true;
        }
      } else {
        log.info('SENDING REQUEST FOR NAME, ID: ', handlerName, id)
        args = { sId: this._sId, ...args };

        this.replyHandlers.set(id, { resolve, reject });
        this.port.postMessage({id, name: handlerName, args: args ?? {}});
      }

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
