import { BeeCursor } from "../../models";
import rawLog from '@bksLogger';
import * as fetch from 'node-fetch';
import { waitFor } from "../base/wait";

const log = rawLog.scope('trinoCursor');

interface TrinoQueryResult {
  id: string;
  infoUri: string;
  nextUri?: string;
  partialCancelUri?: string;
  stats: {
    state: string;
    queued: boolean;
    scheduled: boolean;
    nodes: number;
    totalSplits: number;
    queuedSplits: number;
    runningSplits: number;
    completedSplits: number;
    completedDrivers: number;
    progressPercentage?: number;
  };
  columns?: {
    name: string;
    type: string;
  }[];
  data?: any[][];
  warnings?: {
    message: string;
    warningCode: string;
  }[];
  error?: {
    message: string;
    errorCode: string;
    errorName: string;
    errorType: string;
    errorLocation?: {
      lineNumber: number;
      columnNumber: number;
    };
  };
}

interface CursorOptions {
  connectionConfig: {
    host: string;
    port: number;
    user: string;
    password?: string;
    catalog?: string;
    schema?: string;
    ssl?: boolean;
    accessToken?: string;
    kerberos?: boolean;
    kerberosServiceName?: string;
    kerberosPrincipal?: string;
    kerberosRemoteServiceName?: string;
    headers?: Record<string, string>;
    sslCaFile?: string;
    sslKeyFile?: string;
    sslCertFile?: string;
    rejectUnauthorized?: boolean;
    queryTimeout?: number;
    connectTimeout?: number;
  };
  query: string;
  chunkSize: number;
}

export class TrinoCursor extends BeeCursor {
  private queryId?: string;
  private nextUri?: string;
  private partialCancelUri?: string;
  private columns?: {
    name: string;
    type: string;
  }[];
  private rowBuffer: any[][] = [];
  private bufferReady = false;
  private end = false;
  private error?: Error;
  private activeRequest?: Promise<void>;

  constructor(private options: CursorOptions) {
    super(options.chunkSize);
  }

  private buildHeaders(): Record<string, string> {
    const config = this.options.connectionConfig;
    const headers: Record<string, string> = {
      'X-Trino-User': config.user || 'trino',
      'Content-Type': 'application/json'
    };
    
    // Add basic auth password if provided
    if (config.password) {
      headers['X-Trino-Password'] = config.password;
    }
    
    // Handle different authentication methods
    if (config.kerberos) {
      // For Kerberos, add relevant headers
      headers['X-Trino-Kerberos'] = 'true';
      
      if (config.kerberosServiceName) {
        headers['X-Trino-Kerberos-Service-Name'] = config.kerberosServiceName;
      }
      
      if (config.kerberosPrincipal) {
        headers['X-Trino-Kerberos-Principal'] = config.kerberosPrincipal;
      }
      
      if (config.kerberosRemoteServiceName) {
        headers['X-Trino-Kerberos-Remote-Service-Name'] = config.kerberosRemoteServiceName;
      }
    }
    
    // JWT or OAuth
    if (config.accessToken) {
      headers['Authorization'] = `Bearer ${config.accessToken}`;
    }
    
    // Add any custom headers provided in the config
    if (config.headers && typeof config.headers === 'object') {
      Object.assign(headers, config.headers);
    }

    return headers;
  }

  private buildUrl(path?: string): string {
    const { host, port, ssl } = this.options.connectionConfig;
    const protocol = ssl ? 'https' : 'http';
    return `${protocol}://${host}:${port}${path || '/v1/statement'}`;
  }

  private handleError(error: Error) {
    log.debug("Handling error", error);
    this.error = error;
    this.end = true;
  }

  private handleResult(result: TrinoQueryResult) {
    log.debug(`Query state: ${result.stats.state}`);
    
    // Save query ID if not already set
    if (!this.queryId && result.id) {
      this.queryId = result.id;
    }

    // Set the columns if we received them
    if (result.columns && !this.columns) {
      this.columns = result.columns;
    }

    // Add any rows to our buffer
    if (result.data && result.data.length > 0) {
      this.rowBuffer.push(...result.data);
    }

    // Check for error
    if (result.error) {
      this.handleError(new Error(result.error.message || 'Unknown Trino error'));
      return;
    }

    // Update URIs for pagination and cancellation
    this.nextUri = result.nextUri;
    this.partialCancelUri = result.partialCancelUri;

    // Check if we're done (either by explicit completion or by error)
    // Trino query is done when there's no nextUri
    if (!this.nextUri) {
      this.end = true;
    }

    // Mark buffer as ready if we have data or we've reached the end
    if (this.rowBuffer.length > 0 || this.end) {
      this.bufferReady = true;
    }
    
    // Log query progress if available
    if (result.stats && result.stats.progressPercentage !== undefined) {
      log.debug(`Query progress: ${result.stats.progressPercentage.toFixed(2)}%`);
    }
  }

  private async fetchNextResults(): Promise<void> {
    try {
      if (!this.nextUri) {
        this.end = true;
        return;
      }

      const response = await fetch.default(this.nextUri, {
        method: 'GET',
        headers: this.buildHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP Error: ${response.status}`);
      }

      const result = await response.json() as TrinoQueryResult;
      this.handleResult(result);
    } catch (error) {
      this.handleError(error);
    }
  }

  async start(): Promise<void> {
    log.debug("Starting Trino cursor");
    
    try {
      const { query, connectionConfig } = this.options;
      const url = this.buildUrl();
      
      const response = await fetch.default(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          query,
          catalog: connectionConfig.catalog,
          schema: connectionConfig.schema
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP Error: ${response.status}`);
      }

      const result = await response.json() as TrinoQueryResult;
      this.handleResult(result);
      
      // If the first response doesn't have data and has a nextUri, fetch the next batch
      if (this.rowBuffer.length === 0 && !this.end && this.nextUri) {
        await this.fetchNextResults();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private pop(): any[][] {
    const result = this.rowBuffer.slice(0, this.chunkSize);
    this.rowBuffer = this.rowBuffer.slice(this.chunkSize);
    return result;
  }

  private resume() {
    if (this.activeRequest) return;
    
    this.bufferReady = false;
    
    // If we still have data in the buffer and it's enough for the next chunk,
    // we can just mark the buffer as ready again
    if (this.rowBuffer.length >= this.chunkSize) {
      this.bufferReady = true;
      return;
    }
    
    // Otherwise, we need to fetch more data if we have a nextUri
    if (this.nextUri && !this.end) {
      this.activeRequest = this.fetchNextResults().finally(() => {
        this.activeRequest = undefined;
      });
    } else if (this.rowBuffer.length > 0) {
      // If we have some data but not a full chunk, and no more data is coming,
      // we can still return what we have
      this.bufferReady = true;
    } else {
      // We have no data and no way to get more, so we're at the end
      this.end = true;
    }
  }

  async read(): Promise<any[][]> {
    // Wait for data to be available or for an error
    await waitFor(() => this.bufferReady || this.end || !!this.error);
    
    // If there was an error, throw it
    if (this.error) throw this.error;
    
    // If we're at the end and have no data, return an empty array
    if (this.end && this.rowBuffer.length === 0) return [];
    
    // Get the next chunk from the buffer
    const results = this.pop();
    
    // Start fetching the next chunk if needed
    this.resume();
    
    return results;
  }

  async cancel(): Promise<void> {
    log.debug('Cancelling Trino cursor');
    
    // If there's no query ID, we have nothing to cancel
    if (!this.queryId) {
      this.end = true;
      this.bufferReady = true;
      return;
    }
    
    try {
      // First try to use partialCancelUri if available (more efficient than full cancellation)
      if (this.partialCancelUri) {
        try {
          const response = await fetch.default(this.partialCancelUri, {
            method: 'DELETE',
            headers: this.buildHeaders()
          });
          
          if (response.ok) {
            log.debug('Partial query cancellation successful');
            // Even with partial cancel, we still need to perform a full cancel
          }
        } catch (partialCancelError) {
          log.warn('Error in partial query cancellation, falling back to full cancellation', partialCancelError);
        }
      }
      
      // Full query cancellation
      const url = this.buildUrl(`/v1/query/${this.queryId}`);
      const response = await fetch.default(url, {
        method: 'DELETE',
        headers: this.buildHeaders()
      });
      
      if (response.ok) {
        log.debug('Query cancellation successful');
      } else {
        const errorText = await response.text();
        log.warn(`Error cancelling query: HTTP ${response.status} - ${errorText}`);
      }
    } catch (error) {
      log.warn('Error cancelling Trino query', error);
    } finally {
      // Mark the cursor as ended regardless of whether cancellation succeeded
      this.end = true;
      this.bufferReady = true;
      this.nextUri = undefined;
      this.queryId = undefined;
      this.partialCancelUri = undefined;
      
      // Clear any pending tasks
      if (this.activeRequest) {
        // We can't really cancel an active fetch, but we can ignore its results
        this.activeRequest = undefined;
      }
      
      // Clear the row buffer to free memory
      this.rowBuffer = [];
    }
  }
}