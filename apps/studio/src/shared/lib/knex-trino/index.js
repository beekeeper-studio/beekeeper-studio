"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
exports.__esModule = true;
exports.TrinoKnexClient = void 0;
// Trino Knex Client
var trino_compiler_1 = require("./schema/trino-compiler");
var trino_columncompiler_1 = require("./schema/trino-columncompiler");
var trino_tablecompiler_1 = require("./schema/trino-tablecompiler");
var trino_tablebuilder_1 = require("./schema/trino-tablebuilder");
var trino_viewcompiler_1 = require("./schema/trino-viewcompiler");
var trino_querycompiler_1 = require("./schema/trino-querycompiler");
var Knex = require("knex");
var makeEscape_1 = require("./makeEscape");
var async_1 = require("@cleverbrush/async");
var deep_1 = require("@cleverbrush/deep");
var node_fetch_1 = require("node-fetch");
// Parse date values
var parseDate = function (value) { return new Date(Date.parse(value)); };
// Array string helper for binding parameters
function arrayString(arr, esc) {
    var result = '';
    for (var i = 0; i < arr.length; i++) {
        if (i > 0)
            result += ',';
        var val = arr[i];
        if (val === null || typeof val === 'undefined') {
            result += 'NULL';
        }
        else if (Array.isArray(val)) {
            result += arrayString(val, esc);
        }
        else if (typeof val === 'number') {
            result += val;
        }
        else {
            result += esc(val);
        }
    }
    return "ARRAY[" + result + "]";
}
var TrinoKnexClient = /** @class */ (function (_super) {
    __extends(TrinoKnexClient, _super);
    function TrinoKnexClient(config) {
        if (config === void 0) { config = {}; }
        var _this = this;
        var retryOptions = config.retry;
        _this = _super.call(this, config) || this;
        _this.typeParsers = {
            'date': parseDate,
            'timestamp': parseDate,
            'timestamp with time zone': parseDate
        };
        _this.selectQueryRegex = /^(\s+)?(select|with)/i;
        _this.retryOptions = retryOptions
            ? deep_1.deepExtend({
                maxRetries: 5,
                delayFactor: 2,
                minDelay: 200,
                delayRandomizationPercent: 0.1,
                shouldRetry: function (error) { return error.code === 'ECONNRESET'; }
            }, retryOptions)
            : null;
        return _this;
    }
    TrinoKnexClient.prototype._driver = function () {
        return { name: 'trino' };
    };
    TrinoKnexClient.prototype.tableCompiler = function () {
        return new (trino_tablecompiler_1["default"].bind.apply(trino_tablecompiler_1["default"], __spreadArray([void 0, this], Array.from(arguments))))();
    };
    TrinoKnexClient.prototype.columnCompiler = function () {
        return new (trino_columncompiler_1["default"].bind.apply(trino_columncompiler_1["default"], __spreadArray([void 0, this], Array.from(arguments))))();
    };
    TrinoKnexClient.prototype.schemaCompiler = function () {
        return new (trino_compiler_1["default"].bind.apply(trino_compiler_1["default"], __spreadArray([void 0, this], Array.from(arguments))))();
    };
    TrinoKnexClient.prototype.viewCompiler = function () {
        return new (trino_viewcompiler_1["default"].bind.apply(trino_viewcompiler_1["default"], __spreadArray([void 0, this], Array.from(arguments))))();
    };
    TrinoKnexClient.prototype.queryCompiler = function () {
        return new (trino_querycompiler_1["default"].bind.apply(trino_querycompiler_1["default"], __spreadArray([void 0, this], Array.from(arguments))))();
    };
    TrinoKnexClient.prototype.tableBuilder = function () {
        return new (trino_tablebuilder_1["default"].bind.apply(trino_tablebuilder_1["default"], __spreadArray([void 0, this], Array.from(arguments))))();
    };
    TrinoKnexClient.prototype._escapeBinding = function (value) {
        var escapeBinding = makeEscape_1.makeEscape({
            escapeArray: function (val, esc) {
                return arrayString(val, esc);
            },
            escapeString: function (str) {
                var escaped = "'";
                for (var i = 0; i < str.length; i++) {
                    var c = str[i];
                    if (c === "'") {
                        escaped += c + c;
                    }
                    else if (c === '\\') {
                        escaped += c + c;
                    }
                    else {
                        escaped += c;
                    }
                }
                escaped += "'";
                return escaped;
            },
            escapeObject: function (val, prepareValue, timezone, seen) {
                if (seen === void 0) { seen = []; }
                if (val && typeof val.toPostgres === 'function') {
                    seen = seen || [];
                    if (seen.indexOf(val) !== -1) {
                        throw new Error("circular reference detected while preparing \"" + val + "\" for query");
                    }
                    seen.push(val);
                    return prepareValue(val.toPostgres(prepareValue), seen);
                }
                return JSON.stringify(val);
            }
        });
        var result = escapeBinding(value);
        if (typeof result === 'string') {
            return result.replace(/\\/g, '\\\\');
        }
        return result;
    };
    TrinoKnexClient.prototype._query = function (connection, obj) {
        return __awaiter(this, void 0, void 0, function () {
            var method, query, response, result, responseJson, data, columns, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!obj || typeof obj === 'string') {
                            obj = { sql: obj };
                        }
                        else if (!obj.sql) {
                            throw new Error('The query is empty');
                        }
                        method = obj.method;
                        if (method === 'raw' && this.selectQueryRegex.test(obj.sql)) {
                            method = 'select';
                        }
                        query = Array.isArray(obj.bindings) && obj.bindings.length > 0
                            ? obj.sql
                                .split('?')
                                .map(function (x, i) {
                                return "" + x + (obj.bindings.length > i
                                    ? _this._escapeBinding(obj.bindings[i])
                                    : '');
                            })
                                .join('')
                            : obj.sql;
                        obj.finalQuery = query;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, (this.retryOptions
                                ? async_1.retry(function () { return _this.executeQuery(connection, query); }, this.retryOptions)
                                : this.executeQuery(connection, query))];
                    case 2:
                        result = _a.sent();
                        if (!(method === 'select' || method === 'first' || method === 'pluck')) return [3 /*break*/, 4];
                        return [4 /*yield*/, result.json()];
                    case 3:
                        responseJson = _a.sent();
                        data = responseJson.data, columns = responseJson.columns;
                        obj.response = [data || [], columns || [], responseJson];
                        return [3 /*break*/, 5];
                    case 4:
                        // For non-select statements
                        obj.response = [[], [], result];
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        obj.error = error_1;
                        throw error_1;
                    case 7: return [2 /*return*/, obj];
                }
            });
        });
    };
    TrinoKnexClient.prototype.executeQuery = function (connection, query) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, catalog, schema, user, password, host, port, headers, url, response, errorText, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        _a = connection.config, catalog = _a.catalog, schema = _a.schema, user = _a.user, password = _a.password, host = _a.host, port = _a.port;
                        headers = {
                            'X-Trino-User': user || 'trino',
                            'Content-Type': 'application/json'
                        };
                        if (password) {
                            headers['X-Trino-Password'] = password;
                        }
                        url = (connection.config.ssl ? 'https' : 'http') + "://" + host + ":" + port + "/v1/statement";
                        return [4 /*yield*/, node_fetch_1["default"](url, {
                                method: 'POST',
                                headers: headers,
                                body: JSON.stringify({
                                    query: query,
                                    catalog: catalog,
                                    schema: schema
                                })
                            })];
                    case 1:
                        response = _b.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.text()];
                    case 2:
                        errorText = _b.sent();
                        throw new Error(errorText || "HTTP Error: " + response.status);
                    case 3: return [2 /*return*/, response];
                    case 4:
                        error_2 = _b.sent();
                        console.error('Trino query execution error:', error_2);
                        throw error_2;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    TrinoKnexClient.prototype.processResponse = function (obj, runner) {
        var _this = this;
        if (obj == null)
            return null;
        var response = obj.response, error = obj.error;
        if (error)
            throw error;
        var _a = response || [[], []], rows = _a[0], fields = _a[1], meta = _a[2];
        var parsers = Array.isArray(fields)
            ? fields.map(function (field) {
                return typeof _this.typeParsers[field.type] === 'function'
                    ? _this.typeParsers[field.type]
                    : function (x) { return x; };
            })
            : [];
        var rowToObj = function (row) {
            return fields.reduce(function (acc, field, index) {
                var _a;
                return (__assign(__assign({}, acc), (_a = {}, _a[field.name] = parsers[index] ? parsers[index](row[index]) : row[index], _a)));
            }, {});
        };
        if (obj.output)
            return obj.output.call(runner, rows, fields);
        var method = obj.method;
        if (method === 'raw' && this.selectQueryRegex.test(obj.sql)) {
            method = 'select';
        }
        switch (method) {
            case 'select':
                return [Array.isArray(rows) ? rows.map(function (r) { return rowToObj(r); }) : [], fields, meta];
            case 'first':
                return [rows && rows.length ? rowToObj(rows[0]) : null, fields, meta];
            case 'pluck': {
                var pluckIndex_1 = fields.findIndex(function (val) { return val.name === obj.pluck; });
                if (pluckIndex_1 === -1)
                    return rows;
                return [rows.map(function (row) { return row[pluckIndex_1]; }), obj.pluck, meta];
            }
            case 'insert':
            case 'del':
            case 'update':
            case 'counter':
                return response;
            default:
                return response;
        }
    };
    TrinoKnexClient.prototype.acquireRawConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var connectionConfig, config;
            return __generator(this, function (_a) {
                if (!this.connection) {
                    connectionConfig = this.config.connection;
                    config = {
                        host: connectionConfig.host,
                        port: connectionConfig.port,
                        user: connectionConfig.user,
                        password: connectionConfig.password,
                        catalog: connectionConfig.catalog || 'default',
                        schema: connectionConfig.schema || connectionConfig.database,
                        ssl: connectionConfig.ssl
                    };
                    this.connection = {
                        config: config,
                        connected: true
                    };
                }
                return [2 /*return*/, this.connection];
            });
        });
    };
    TrinoKnexClient.prototype.destroyRawConnection = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                connection.connected = false;
                return [2 /*return*/];
            });
        });
    };
    return TrinoKnexClient;
}(Knex.Client));
exports.TrinoKnexClient = TrinoKnexClient;
Object.assign(TrinoKnexClient.prototype, {
    dialect: 'trino',
    driverName: 'trino',
    canCancelQuery: true
});
