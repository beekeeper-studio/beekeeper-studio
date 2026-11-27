import { BeeCursor, TableColumn } from "@/lib/db/models";
import { CursorResult, QueryLeaf } from "@queryleaf/lib";
import { AggregationCursor } from "mongodb";
import _ from "lodash";
import { objectIdsToHex } from "./utils";

interface CursorOptions {
  query?: string,
  queryLeaf?: QueryLeaf,
  cursor?: AggregationCursor,
  columns?: string[],
  chunkSize: number
}

export class MongoDBCursor extends BeeCursor {
  private readonly options: CursorOptions;
  private cursor: CursorResult;
  private error?: Error;
  private fields?: string[];

  constructor(options: CursorOptions) {
    super(options.chunkSize);
    this.options = options;
    // an empty list means the columns aren't known yet, so read them from the documents
    this.fields = options.columns?.length ? options.columns : undefined;
  }

  get columns(): TableColumn[] | null {
    if (!this.fields) return null;
    return this.fields.map((f) => ({
      columnName: f,
      dataType: 'unknown'
    }))
  }

  private handleError(error: Error) {
    this.error = error;
  }

  async start(): Promise<void> {
    if (this.options.queryLeaf) {
      this.cursor = await this.options.queryLeaf.executeCursor(this.options.query, { batchSize: this.chunkSize });
    } else if (this.options.cursor) {
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

      const docs = [firstDoc, ...rest];

      if (!this.fields) {
        this.fields = _.uniq(_.flatten(docs.map((obj) => Object.keys(obj))));
      }

      // fields can come in any order or be missing, so build rows by field name
      return docs.map((doc) => this.fields.map((field) => objectIdsToHex(doc[field])));
    }
    return [];
  }
  async cancel(): Promise<void> {
    await this.cursor.close();
  }

}
