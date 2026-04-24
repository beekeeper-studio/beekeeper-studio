import { BeeCursor } from "@/lib/db/models";
import { DynamoDBDocumentClient, ScanCommand, ExecuteStatementCommand } from "@aws-sdk/lib-dynamodb";

interface ScanCursorOptions {
  kind: 'scan';
  client: DynamoDBDocumentClient;
  table: string;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  chunkSize: number;
}

interface PartiQLCursorOptions {
  kind: 'partiql';
  client: DynamoDBDocumentClient;
  statement: string;
  chunkSize: number;
}

export type DynamoDBCursorOptions = ScanCursorOptions | PartiQLCursorOptions;

// Streams items out of DynamoDB using LastEvaluatedKey / NextToken pagination.
// Returned rows are arrays (positional) keyed off the discovered column order —
// the caller is responsible for passing `columns` to selectTopStream so ordering
// matches what Tabulator expects.
export class DynamoDBCursor extends BeeCursor {
  private readonly options: DynamoDBCursorOptions;
  private lastEvaluatedKey: Record<string, any> | undefined;
  private nextToken: string | undefined;
  private exhausted = false;
  private buffer: any[] = [];
  private columns: string[] = [];

  constructor(options: DynamoDBCursorOptions, columns: string[]) {
    super(options.chunkSize);
    this.options = options;
    this.columns = columns;
  }

  async start(): Promise<void> {
    // Lazily paginated; nothing to do upfront.
  }

  private async fetchNextPage(): Promise<void> {
    if (this.exhausted) return;

    if (this.options.kind === 'scan') {
      const result = await this.options.client.send(new ScanCommand({
        TableName: this.options.table,
        FilterExpression: this.options.filterExpression,
        ExpressionAttributeNames: this.options.expressionAttributeNames,
        ExpressionAttributeValues: this.options.expressionAttributeValues,
        ExclusiveStartKey: this.lastEvaluatedKey,
        Limit: this.chunkSize,
      }));
      this.buffer.push(...(result.Items || []));
      this.lastEvaluatedKey = result.LastEvaluatedKey;
      if (!this.lastEvaluatedKey) {
        this.exhausted = true;
      }
    } else {
      const result = await this.options.client.send(new ExecuteStatementCommand({
        Statement: this.options.statement,
        NextToken: this.nextToken,
        Limit: this.chunkSize,
      }));
      this.buffer.push(...(result.Items || []));
      this.nextToken = result.NextToken;
      if (!this.nextToken) {
        this.exhausted = true;
      }
    }
  }

  async read(): Promise<any[][]> {
    while (this.buffer.length < this.chunkSize && !this.exhausted) {
      await this.fetchNextPage();
    }
    if (this.buffer.length === 0) return [];

    const take = this.buffer.splice(0, this.chunkSize);
    return take.map((item) => this.columns.map((c) => item[c]));
  }

  async cancel(): Promise<void> {
    this.exhausted = true;
    this.buffer = [];
  }
}
