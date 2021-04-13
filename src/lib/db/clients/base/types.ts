


export abstract class BeeCursor {
  constructor() {

  }
  abstract start(): Promise<void>
  abstract read(chunkSize: number): Promise<any[]>
  abstract cancel(): Promise<void>
  async close() {
    await this.cancel()
  }
}