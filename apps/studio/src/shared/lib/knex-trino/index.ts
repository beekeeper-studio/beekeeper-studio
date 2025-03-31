// Trino Knex Client
import SchemaCompiler from "./schema/trino-compiler";
import ColumnCompiler from "./schema/trino-columncompiler";
import TableCompiler from "./schema/trino-tablecompiler";
import TableBuilder from "./schema/trino-tablebuilder";
import ViewCompiler from "./schema/trino-viewcompiler";
import QueryCompiler from "./schema/trino-querycompiler";

import * as Knex from 'knex';
import { makeEscape } from './makeEscape';
import { retry } from '@cleverbrush/async';
import { deepExtend } from '@cleverbrush/deep';
import fetch from 'node-fetch';

// Parse date values
const parseDate = (value: any): Date => new Date(Date.parse(value));

// Array string helper for binding parameters
function arrayString(arr: any[], esc: (val: any) => string): string {
    let result = '';
    for (let i = 0; i < arr.length; i++) {
        if (i > 0) result += ',';
        const val = arr[i];
        if (val === null || typeof val === 'undefined') {
            result += 'NULL';
        } else if (Array.isArray(val)) {
            result += arrayString(val, esc);
        } else if (typeof val === 'number') {
            result += val;
        } else {
            result += esc(val);
        }
    }

    return `ARRAY[${result}]`;
}

type AdditionalClientOptions = {
    /**
     * Options for retrying the query
     */
    retry?: Parameters<typeof retry>[1];
};

interface TrinoConnectionConfig {
    host: string;
    port: number;
    user: string;
    password?: string;
    catalog?: string;
    schema?: string;
    database?: string;
    ssl?: boolean;
}

export class TrinoKnexClient extends Knex.Client {
    static dialectName = 'trino';
    static driverName = 'trino';
    
    _driver() {
        return { name: 'trino' };
    }

    private retryOptions: Parameters<typeof retry>[1];

    constructor(config: Knex.Config & AdditionalClientOptions = {}) {
        // Make a copy of the config to avoid modifying it
        const clientConfig = { ...config };
        
        super(clientConfig);

        // Extract retry options from config
        const retryOptions = config.retry;
        
        this.retryOptions = retryOptions
            ? deepExtend(
                  {
                      maxRetries: 5,
                      delayFactor: 2,
                      minDelay: 200,
                      delayRandomizationPercent: 0.1,
                      shouldRetry: (error: any) => error.code === 'ECONNRESET'
                  },
                  retryOptions
              )
            : null;
    }
    
    // This factory method is used by Knex for initialization
    static get(config: Knex.Config & AdditionalClientOptions = {}) {
        return new TrinoKnexClient(config);
    }

    private typeParsers = {
        'date': parseDate,
        'timestamp': parseDate,
        'timestamp with time zone': parseDate
    };

    private selectQueryRegex = /^(\s+)?(select|with)/i;

    tableCompiler(this: any) {
        return new TableCompiler(this, ...Array.from(arguments));
    }

    columnCompiler(this: any) {
        return new ColumnCompiler(this, ...Array.from(arguments));
    }

    schemaCompiler(this: any) {
        return new SchemaCompiler(this, ...Array.from(arguments));
    }

    viewCompiler(this: any) {
        return new ViewCompiler(this, ...Array.from(arguments));
    }

    queryCompiler(this: any) {
        return new QueryCompiler(this, ...Array.from(arguments));
    }

    tableBuilder(this: any) {
        return new TableBuilder(this, ...Array.from(arguments));
    }

    _escapeBinding(value: any): any {
        const escapeBinding = makeEscape({
            escapeArray(val: any[], esc: (val: any) => string): string {
                return arrayString(val, esc);
            },
            escapeString(str: string): string {
                let escaped = "'";

                for (let i = 0; i < str.length; i++) {
                    const c = str[i];
                    if (c === "'") {
                        escaped += c + c;
                    } else if (c === '\\') {
                        escaped += c + c;
                    } else {
                        escaped += c;
                    }
                }
                escaped += "'";
                return escaped;
            },
            escapeObject(val: any, prepareValue: (val: any, seen?: any[]) => any, timezone?: string, seen: any[] = []): string {
                if (val && typeof val.toPostgres === 'function') {
                    seen = seen || [];
                    if (seen.indexOf(val) !== -1) {
                        throw new Error(
                            `circular reference detected while preparing "${val}" for query`
                        );
                    }

                    seen.push(val);

                    return prepareValue(val.toPostgres(prepareValue), seen);
                }
                return JSON.stringify(val);
            }
        });

        const result = escapeBinding(value);

        if (typeof result === 'string') {
            return result.replace(/\\/g, '\\\\');
        }

        return result;
    }

    async _query(connection: any, obj: any): Promise<any> {
        if (!obj || typeof obj === 'string') {
            obj = { sql: obj };
        } else if (!obj.sql) {
            throw new Error('The query is empty');
        }

        let { method } = obj;

        if (method === 'raw' && this.selectQueryRegex.test(obj.sql)) {
            method = 'select';
        }

        const query =
            Array.isArray(obj.bindings) && obj.bindings.length > 0
                ? obj.sql
                      .split('?')
                      .map(
                          (x: string, i: number) =>
                              `${x}${
                                  obj.bindings.length > i
                                      ? this._escapeBinding(obj.bindings[i])
                                      : ''
                              }`
                      )
                      .join('')
                : obj.sql;

        let response;
        obj.finalQuery = query;

        // Use the appropriate method based on query type
        try {
            const result = await (this.retryOptions
                ? retry(
                      () => this.executeQuery(connection, query),
                      this.retryOptions
                  )
                : this.executeQuery(connection, query));

            if (method === 'select' || method === 'first' || method === 'pluck') {
                const responseJson = await result.json();
                const { data, columns } = responseJson;

                obj.response = [data || [], columns || [], responseJson];
            } else {
                // For non-select statements
                obj.response = [[], [], result];
            }
        } catch (error) {
            obj.error = error;
            throw error;
        }

        return obj;
    }

    private async executeQuery(connection: any, query: string): Promise<Response> {
        try {
            const { catalog, schema, user, password, host, port } = connection.config;
            
            const headers: Record<string, string> = {
                'X-Trino-User': user || 'trino',
                'Content-Type': 'application/json'
            };
            
            if (password) {
                headers['X-Trino-Password'] = password;
            }

            const url = `${connection.config.ssl ? 'https' : 'http'}://${host}:${port}/v1/statement`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    query,
                    catalog,
                    schema
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP Error: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            console.error('Trino query execution error:', error);
            throw error;
        }
    }

    processResponse(obj: any, runner: any): any {
        if (obj == null) return null;
        const { response, error } = obj;

        if (error) throw error;

        const [rows, fields, meta] = response || [[], []];

        const parsers = Array.isArray(fields)
            ? fields.map((field: any) =>
                  typeof this.typeParsers[field.type] === 'function'
                      ? this.typeParsers[field.type]
                      : (x: any) => x
              )
            : [];

        const rowToObj = (row: any[]) =>
            fields.reduce(
                (acc: Record<string, any>, field: any, index: number) => ({
                    ...acc,
                    [field.name]: parsers[index] ? parsers[index](row[index]) : row[index]
                }),
                {}
            );

        if (obj.output) return obj.output.call(runner, rows, fields);

        let { method } = obj;

        if (method === 'raw' && this.selectQueryRegex.test(obj.sql)) {
            method = 'select';
        }

        switch (method) {
            case 'select':
                return [Array.isArray(rows) ? rows.map((r) => rowToObj(r)) : [], fields, meta];
            case 'first':
                return [rows && rows.length ? rowToObj(rows[0]) : null, fields, meta];
            case 'pluck': {
                const pluckIndex = fields.findIndex(
                    (val: any) => val.name === obj.pluck
                );
                if (pluckIndex === -1) return rows;
                return [rows.map((row: any[]) => row[pluckIndex]), obj.pluck, meta];
            }
            case 'insert':
            case 'del':
            case 'update':
            case 'counter':
                return response;
            default:
                return response;
        }
    }

    private connection: any;

    async acquireRawConnection(): Promise<any> {
        if (!this.connection) {
            const connectionConfig = this.config.connection as TrinoConnectionConfig;
            const config = {
                host: connectionConfig.host,
                port: connectionConfig.port,
                user: connectionConfig.user,
                password: connectionConfig.password,
                catalog: connectionConfig.catalog || 'default',
                schema: connectionConfig.schema || connectionConfig.database,
                ssl: connectionConfig.ssl
            };

            this.connection = {
                config,
                connected: true
            };
        }

        return this.connection;
    }

    async destroyRawConnection(connection: any): Promise<void> {
        connection.connected = false;
    }
}

Object.assign(TrinoKnexClient.prototype, {
    dialect: 'trino',
    driverName: 'trino',
    canCancelQuery: true
});