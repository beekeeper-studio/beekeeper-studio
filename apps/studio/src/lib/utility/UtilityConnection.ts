import { uuidv4 } from "../uuid";
import rawLog from '@bksLogger';
import _ from 'lodash';
import { PluginError, PluginSystemError, UtilityConnectionLostError } from "../errors";

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
  private listeners: Array<{type: string, id: string, listener: Listener}> = [];
  private messageQueue: Array<Message> = [];
  private port: MessagePort;
  private _sId: string;
  private portsRequested: boolean = false;

  public get sId() {
    return this._sId;
  }

  /** Clears replyHandlers and rejects every entry with reason. Cleared
   * before rejecting so a rejection handler that calls send() right away
   * cannot see stale entries. */
  private failInFlight(reason: string) {
    const handlers = this.replyHandlers;
    this.replyHandlers = new Map();
    handlers.forEach(({ reject }) => reject(new UtilityConnectionLostError(reason)));
  }

  private handlePortClosed(port: MessagePort) {
    // A replaced port can still emit `close` after its replacement is
    // already installed; that must not touch the live port.
    if (port !== this.port) return;
    log.warn('UTILITY PORT CLOSED');
    this.failInFlight('The utility process exited while this request was in progress');
    this.port = null;
    this.portsRequested = false;
  }

  public setPort(port: MessagePort, sId: string) {
    if (this.port && this.port !== port) {
      this.failInFlight('The utility process was restarted while this request was in progress');
    }

    this.port = port;
    this._sId = sId;
    log.info('RECEIVED PORT IN UtilityConnection: ', port);
    this.port.onmessage = (msg) => {
      const { data: msgData } = msg;

      if (msgData.type === 'error') {
        // handle errors
        const {
          id,
          error,
          stack,
          errorName,
          errorCode,
          errorDetail,
          errorHint,
        } = msgData

        const handler = this.replyHandlers.get(id);
        if (handler) {
          log.error('GOT ERROR BACK FOR REQUEST ID: ', id);
          this.replyHandlers.delete(id);
          let err: Error;
          if (errorName === "PluginSystemError") {
            err = new PluginSystemError(errorCode, error);
          } else if (errorName === "PluginError") {
            err = new PluginError(errorCode, error);
          } else {
            err = new Error(error);
          }

          Object.assign(err, {
            detail: errorDetail,
            hint: errorHint,
          })

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
    this.port.addEventListener('close', () => this.handlePortClosed(port));

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

  public async send(handlerName: string, args?: any): Promise<any> {
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
