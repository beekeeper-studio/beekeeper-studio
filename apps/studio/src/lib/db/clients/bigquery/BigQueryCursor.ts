import { BeeCursor } from "../../models";
import rawLog from '@bksLogger';
import { BigQuery, GetRowsOptions, Job, QueryResultsOptions, RowMetadata } from "@google-cloud/bigquery";
import { waitFor } from "../base/wait";

const log = rawLog.scope('bigquerycursor');
type Conn = BigQuery;

interface MiniCursor {
  options: QueryResultsOptions
  job: Job
}

export class BigQueryCursor extends BeeCursor {

  private cursor?: MiniCursor;
  private rowBuffer: any[][] = [];
  private bufferReady = false;
  private end = false;
  private error?: Error;

  constructor(
    private conn: Conn, 
    private query: string, 
    private params: string[], 
    chunkSize: number
  ) {
    super(chunkSize);
  }

  async start(): Promise<void> {
    log.debug("start");

    const query = {
      query: this.query,
      params: this.params
    }
    const [job] = await this.conn.createQueryJob(query);
    const promise = new Promise<void>((resolve, _reject) => {
      const queryOptions = {
        autoPaginate: false,
        // wtf bigquery?
        startIndex: '0',
        maxResults: this.chunkSize
      }

      job.getQueryResults(queryOptions, this.handleRow.bind(this));
      job.on('error', this.handleError.bind(this));
      this.cursor = { job: job, options: queryOptions };
      resolve();
    })
    return promise;
  }

  private handleRow(err: Error | null, resource?: RowMetadata, nextQuery?: GetRowsOptions, _response?: any): void {
    if (err) {
      this.handleError(err);
      return;
    }
    if (nextQuery) {
      this.cursor.options.pageToken = nextQuery.pageToken;
    } else {
      this.handleEnd();
    }
    this.rowBuffer.push(...resource);
    this.pause();
  }

  private handleError(error: Error) {
    log.debug("handling error");
    this.error = error;
    console.error(error);
  }

  private handleEnd() {
    log.debug("handling end");
    this.end = true;
    this.cursor?.job.removeAllListeners();
  }

  private pop() {
    const result = this.rowBuffer;
    this.rowBuffer = [];
    return result;
  }

  // don't need to do anything here because the bigquery query is automatically 'paused'
  private pause() {
    this.bufferReady = true;
  }

  private resume() {
    this.bufferReady = false;
    this.cursor.job.getQueryResults(this.cursor.options, this.handleRow.bind(this));
  }

  async read(): Promise<any[][]> {
    await waitFor(() => this.bufferReady || this.end || !!this.error);
    if (this.error) throw this.error;
    if (this.end) return this.pop()
    const results = this.pop();
    this.resume();
    return results;
  }

  async cancel(): Promise<void> {
    log.debug('cursor cancelled');
    this.cursor?.job.cancel();
  }
}
