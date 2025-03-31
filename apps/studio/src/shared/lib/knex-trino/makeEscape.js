"use strict";
exports.__esModule = true;
exports.makeEscape = void 0;
var charsRegex = /[\0\b\t\n\r\x1a"'\\]/g; // eslint-disable-line no-control-regex
var charsMap = {
    '\0': '\\0',
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\r': '\\r',
    '\x1a': '\\Z',
    '"': '\\"',
    "'": "\\'",
    '\\': '\\\\'
};
var wrapEscape = function (escapeFn) {
    return function finalEscape(val, ctx) {
        if (ctx === void 0) { ctx = {}; }
        return escapeFn(val, finalEscape, ctx);
    };
};
var escapeObject = function (val, finalEscape, ctx) {
    if (val && typeof val.toSQL === 'function') {
        return val.toSQL(ctx);
    }
    return JSON.stringify(val);
};
var escapeString = function (val) {
    var chunkIndex = (charsRegex.lastIndex = 0);
    var escapedVal = '';
    var match;
    while ((match = charsRegex.exec(val))) {
        escapedVal += val.slice(chunkIndex, match.index) + charsMap[match[0]];
        chunkIndex = charsRegex.lastIndex;
    }
    if (chunkIndex === 0) {
        // Nothing was escaped
        return "'" + val + "'";
    }
    if (chunkIndex < val.length) {
        return "'" + escapedVal + val.slice(chunkIndex) + "'";
    }
    return "'" + escapedVal + "'";
};
var bufferToString = function (buffer) { return "X" + escapeString(buffer.toString('hex')); };
var arrayToList = function (array, finalEscape, ctx) {
    var sql = '';
    for (var i = 0; i < array.length; i++) {
        var val = array[i];
        if (Array.isArray(val)) {
            sql +=
                (i === 0 ? '' : ', ') +
                    '(' +
                    arrayToList(val, finalEscape, ctx) +
                    ')';
        }
        else {
            sql += (i === 0 ? '' : ', ') + finalEscape(val, ctx);
        }
    }
    return sql;
};
var zeroPad = function (number, length) {
    number = number.toString();
    while (number.length < length) {
        number = "0" + number;
    }
    return number;
};
var convertTimezone = function (tz) {
    if (tz === 'Z') {
        return 0;
    }
    var m = tz.match(/([+\-\s])(\d\d):?(\d\d)?/);
    if (m) {
        return ((m[1] == '-' ? -1 : 1) *
            (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60) *
            60);
    }
    return false;
};
var dateToString = function (date, finalEscape, ctx) {
    if (ctx === void 0) { ctx = {}; }
    // @ts-ignore
    var timeZone = ctx.timeZone || 'local';
    var dt = new Date(date);
    var year;
    var month;
    var day;
    var hour;
    var minute;
    var second;
    var millisecond;
    if (timeZone === 'local') {
        year = dt.getFullYear();
        month = dt.getMonth() + 1;
        day = dt.getDate();
        hour = dt.getHours();
        minute = dt.getMinutes();
        second = dt.getSeconds();
        millisecond = dt.getMilliseconds();
    }
    else {
        var tz = convertTimezone(timeZone);
        if (tz !== false && tz !== 0) {
            dt.setTime(dt.getTime() + tz * 60000);
        }
        year = dt.getUTCFullYear();
        month = dt.getUTCMonth() + 1;
        day = dt.getUTCDate();
        hour = dt.getUTCHours();
        minute = dt.getUTCMinutes();
        second = dt.getUTCSeconds();
        millisecond = dt.getUTCMilliseconds();
    }
    // YYYY-MM-DD HH:mm:ss.mmm
    return zeroPad(year, 4) + "-" + zeroPad(month, 2) + "-" + zeroPad(day, 2) + " " + zeroPad(hour, 2) + ":" + zeroPad(minute, 2) + ":" + zeroPad(second, 2) + "." + zeroPad(millisecond, 3);
};
var makeEscape = function (config) {
    if (config === void 0) { config = {}; }
    var finalEscapeDate = config.escapeDate || dateToString;
    var finalEscapeArray = config.escapeArray || arrayToList;
    var finalEscapeBuffer = config.escapeBuffer || bufferToString;
    var finalEscapeString = config.escapeString || escapeString;
    var finalEscapeObject = config.escapeObject || escapeObject;
    var finalWrap = config.wrap || wrapEscape;
    function escapeFn(val, finalEscape, ctx) {
        if (val === undefined || val === null) {
            return 'NULL';
        }
        switch (typeof val) {
            case 'boolean':
                return val ? 'true' : 'false';
            case 'number':
                return val + '';
            case 'object':
                if (val instanceof Date) {
                    val = finalEscapeDate(val, finalEscape, ctx);
                }
                else if (Array.isArray(val)) {
                    return finalEscapeArray(val, finalEscape, ctx);
                }
                else if (Buffer.isBuffer(val)) {
                    return finalEscapeBuffer(val, finalEscape, ctx);
                }
                else {
                    return finalEscapeObject(val, finalEscape, ctx);
                }
        }
        return finalEscapeString(val, finalEscape, ctx);
    }
    return finalWrap ? finalWrap(escapeFn) : escapeFn;
};
exports.makeEscape = makeEscape;
