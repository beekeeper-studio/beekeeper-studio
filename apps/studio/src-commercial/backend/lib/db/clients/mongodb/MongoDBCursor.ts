import { BeeCursor } from "@/lib/db/models";
import { CursorResult, QueryLeaf } from "@queryleaf/lib";
import { AggregationCursor } from "mongodb";

interface CursorOptions {
  query?: string,
  queryLeaf?: QueryLeaf,
  cursor?: AggregationCursor,
  chunkSize: number
}

export class MongoDBCursor extends BeeCursor {
  private readonly options: CursorOptions;
  private cursor: CursorResult;
  private error?: Error;

  constructor(options: CursorOptions) {
    super(options.chunkSize);
    this.options = options;
  }

  private handleError(error: Error) {
    this.error = error;
  }

  async start(): Promise<void> {
    if (this.options.queryLeaf) {
      this.cursor = await this.options.queryLeaf.executeCursor(this.options.query, { batchSize: this.chunkSize });
    } else if (this.options.cursor) {
      // @ts-expect-error stupid peer dependencies
      this.cursor = this.options.cursor;
    } else {
      throw new Error('You need either a cursor or a queryleaf instance to be passed to the cursor');
    }
    this.cursor.on('error', this.handleError.bind(this));
  }

  async read(): Promise<any[][]> {
    if (this.error) throw this.error;
    if (!this.cursor) {
      throw new Error("You need to call start first");
    }

    if (await this.cursor.hasNext()) {
      // we have to call this to trigger mongo to fetch the next batch 
      const firstDoc = await this.cursor.next();
      const rest = this.cursor.readBufferedDocuments();

      return [firstDoc, ...rest].map((v) => Object.values(v));
    }
    return [];
  }
  async cancel(): Promise<void> {
    await this.cursor.close();
  }
  
}
