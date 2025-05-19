import rawLog from '@bksLogger';
import _ from 'lodash';
import { uuidv4 } from "../uuid";

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
  private listeners: Array<{ type: string, id: string, listener: Listener }> = [];
  private messageQueue: Array<Message> = [];
  private port: MessagePort;
  private _sId: string;
  private portsRequested = false;

  public get sId() {
    return this._sId;
  }

  public async hasWorkingPort(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        reject(new Error('No port available'));
        return;
      }
      try {
        const id = uuidv4();
        this.replyHandlers.set(id, { resolve, reject });
        this.port.postMessage({ id, name: 'ping', args: { sId: this._sId } });
      } catch (err) {
        log.error('Error checking port:', err);
        reject(err);
      }
    })
  }

  public setPort(port: MessagePort, sId: string) {
    if (!port) {
      log.error('Attempted to set null/undefined port');
      return;
    }

    this.port = port;
    this._sId = sId;
    log.info('RECEIVED PORT IN UtilityConnection: ', port);

    this.port.onmessage = (msg) => {
      if (!msg || !msg.data) {
        log.error('Received null/invalid message in port handler');
        return;
      }

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
      } else if (_.some(this.listeners, ({ type }) => msgData.type === type)) {
        const listenerObj = this.listeners.find(({ type }) => msgData.type === type);
        if (listenerObj) {
          const { listener, type, id } = listenerObj;
          log.info('HANDLING REQUEST WITH LISTENER (type, id): ', type, id);
          const { input } = msgData;
          listener(input);
        }
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
        this.port.postMessage({ id, name: handlerName, args: args ?? {} })
      });
      this.messageQueue = [];
    }
  }

  public async send(handlerName: string, args: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      if (!handlerName) {
        log.error('Attempted to send with null/undefined handlerName');
        reject(new Error('Invalid handler name'));
        return;
      }

      const id = uuidv4();

      if (!this.port) {
        log.info('QUEUEING REQUEST FOR NAME, ID: ', handlerName, id);
        this.messageQueue.push({ handlerName, args: args || {}, id, resolve, reject });
        if (!this.portsRequested) {
          try {
            window.main.requestPorts();
            this.portsRequested = true;
          } catch (err) {
            log.error('Failed to request ports:', err);
            reject(new Error('Failed to request ports'));
            return;
          }
        }
      } else {
        try {
          log.info('SENDING REQUEST FOR NAME, ID: ', handlerName, id);
          args = { sId: this._sId, ...(args || {}) };

          this.replyHandlers.set(id, { resolve, reject });
          this.port.postMessage({ id, name: handlerName, args: args });
        } catch (err) {
          log.error('Error sending message through port:', err);
          this.replyHandlers.delete(id);
          reject(err);
        }
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
