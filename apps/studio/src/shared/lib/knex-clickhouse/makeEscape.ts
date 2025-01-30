// Copyright (C) 2024 by Andrew Zolotuhkin <andrew_zol@cleverbrush.com>
/*
 *  NOTE: functions below are taken from knex npm package,
 *  unfortunately they are not exported, so we have to copy them here
 *  because they are useful when it comes to write your own knex dialect
 */

const charsRegex = /[\0\b\t\n\r\x1a"'\\]/g; // eslint-disable-line no-control-regex
const charsMap = {
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

const wrapEscape = (escapeFn) =>
    function finalEscape(val, ctx = {}) {
        return escapeFn(val, finalEscape, ctx);
    };

const escapeObject = (val, finalEscape, ctx) => {
    if (val && typeof val.toSQL === 'function') {
        return val.toSQL(ctx);
    }
    return JSON.stringify(val);
};

// eslint-disable-next-line
const escapeString = (val) => {
    // eslint-disable-next-line
    let chunkIndex = (charsRegex.lastIndex = 0);
    let escapedVal = '';
    let match;

    // eslint-disable-next-line
    while ((match = charsRegex.exec(val))) {
        escapedVal += val.slice(chunkIndex, match.index) + charsMap[match[0]];
        chunkIndex = charsRegex.lastIndex;
    }

    if (chunkIndex === 0) {
        // Nothing was escaped
        return `'${val}'`;
    }

    if (chunkIndex < val.length) {
        return `'${escapedVal}${val.slice(chunkIndex)}'`;
    }

    return `'${escapedVal}'`;
};

const bufferToString = (buffer) => `X${escapeString(buffer.toString('hex'))}`;

const arrayToList = (array, finalEscape, ctx) => {
    let sql = '';
    for (let i = 0; i < array.length; i++) {
        const val = array[i];
        if (Array.isArray(val)) {
            sql +=
                // eslint-disable-next-line
                (i === 0 ? '' : ', ') +
                '(' +
                arrayToList(val, finalEscape, ctx) +
                ')';
        } else {
            sql += (i === 0 ? '' : ', ') + finalEscape(val, ctx);
        }
    }
    return sql;
};

const zeroPad = (number, length) => {
    number = number.toString();
    while (number.length < length) {
        number = `0${number}`;
    }
    return number;
};

const convertTimezone = (tz) => {
    if (tz === 'Z') {
        return 0;
    }
    const m = tz.match(/([+\-\s])(\d\d):?(\d\d)?/);
    if (m) {
        return (
            // eslint-disable-next-line
            (m[1] == '-' ? -1 : 1) *
            (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60) *
            60
        );
    }
    return false;
};

const dateToString = (date, finalEscape, ctx = {}) => {
    // @ts-ignore
    const timeZone = ctx.timeZone || 'local';

    const dt = new Date(date);
    let year;
    let month;
    let day;
    let hour;
    let minute;
    let second;
    let millisecond;

    if (timeZone === 'local') {
        year = dt.getFullYear();
        month = dt.getMonth() + 1;
        day = dt.getDate();
        hour = dt.getHours();
        minute = dt.getMinutes();
        second = dt.getSeconds();
        millisecond = dt.getMilliseconds();
    } else {
        const tz = convertTimezone(timeZone);

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
    return `${zeroPad(year, 4)}-${zeroPad(month, 2)}-${zeroPad(
        day,
        2
    )} ${zeroPad(hour, 2)}:${zeroPad(minute, 2)}:${zeroPad(
        second,
        2
    )}.${zeroPad(millisecond, 3)}`;
};

export const makeEscape = (config: any = {}) => {
    const finalEscapeDate = config.escapeDate || dateToString;
    const finalEscapeArray = config.escapeArray || arrayToList;
    const finalEscapeBuffer = config.escapeBuffer || bufferToString;
    const finalEscapeString = config.escapeString || escapeString;
    const finalEscapeObject = config.escapeObject || escapeObject;
    const finalWrap = config.wrap || wrapEscape;

    function escapeFn(val, finalEscape, ctx) {
        if (val === undefined || val === null) {
            return 'NULL';
        }
        // eslint-disable-next-line
        switch (typeof val) {
            case 'boolean':
                return val ? 'true' : 'false';
            case 'number':
                // eslint-disable-next-line
                return val + '';
            case 'object':
                if (val instanceof Date) {
                    val = finalEscapeDate(val, finalEscape, ctx);
                } else if (Array.isArray(val)) {
                    return finalEscapeArray(val, finalEscape, ctx);
                } else if (Buffer.isBuffer(val)) {
                    return finalEscapeBuffer(val, finalEscape, ctx);
                } else {
                    return finalEscapeObject(val, finalEscape, ctx);
                }
        }
        return finalEscapeString(val, finalEscape, ctx);
    }

    return finalWrap ? finalWrap(escapeFn) : escapeFn;
};
