import { Readable } from "stream";
import { TableColumn } from "../models";
import _ from "lodash";

export interface CursorOptions {
  query: string,
  params: string[],
  manageConnection?: boolean,
  isStreaming?: boolean,
  chunkSize: number,
}

export abstract class BeeCursor {
  constructor(public options: CursorOptions) {
  }

  get chunkSize(): number {
    return this.options.chunkSize;
  }

  get manageConnection(): boolean {
    return _.isNil(this.options.manageConnection) ||
      this.options.manageConnection;
  }

  abstract get columns(): TableColumn[] | null
  abstract start(): Promise<void>
  abstract read(): Promise<any[][]>
  abstract cancel(): Promise<void>
  abstract stream(): Readable | null
  async close() {
    await this.cancel()
  }
}

export class NoOpCursor extends BeeCursor {
  get columns(): TableColumn[] | null {
    return null;
  }

  async start(): Promise<void> {
    // yes
  }
  async read(): Promise<any[][]> {
    return []
  }
  async cancel(): Promise<void> {
    // yes
  }

  stream(): Readable | null {
    return null;
  }

}

export interface StreamResults {
  columns?: TableColumn[],
  totalRows?: number,
  cursor: BeeCursor
}

