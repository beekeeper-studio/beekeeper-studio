const charsRegex = /[\0\b\t\n\r\x1a"'\\]/g; // eslint-disable-line no-control-regex
const charsMap: Record<string, string> = {
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

interface EscapeContext {
    timeZone?: string;
    [key: string]: any;
}

type EscapeFn = (val: any, finalEscape: any, ctx?: EscapeContext) => string;

const wrapEscape = (escapeFn: EscapeFn): ((val: any, ctx?: EscapeContext) => string) =>
    function finalEscape(val: any, ctx: EscapeContext = {}) {
        return escapeFn(val, finalEscape, ctx);
    };

const escapeObject = (val: any, finalEscape: any, ctx: EscapeContext): string => {
    if (val && typeof val.toSQL === 'function') {
        return val.toSQL(ctx);
    }
    return JSON.stringify(val);
};

const escapeString = (val: string): string => {
    let chunkIndex = (charsRegex.lastIndex = 0);
    let escapedVal = '';
    let match;

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

const bufferToString = (buffer: Buffer): string => `X${escapeString(buffer.toString('hex'))}`;

const arrayToList = (array: any[], finalEscape: any, ctx: EscapeContext): string => {
    let sql = '';
    for (let i = 0; i < array.length; i++) {
        const val = array[i];
        if (Array.isArray(val)) {
            sql +=
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

const zeroPad = (number: number | string, length: number): string => {
    let numStr = number.toString();
    while (numStr.length < length) {
        numStr = `0${numStr}`;
    }
    return numStr;
};

const convertTimezone = (tz: string): number | false => {
    if (tz === 'Z') {
        return 0;
    }
    const m = tz.match(/([+\-\s])(\d\d):?(\d\d)?/);
    if (m) {
        return (
            (m[1] === '-' ? -1 : 1) *
            (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60) *
            60
        );
    }
    return false;
};

const dateToString = (date: Date, finalEscape: any, ctx: EscapeContext = {}): string => {
    const timeZone = ctx.timeZone || 'local';

    const dt = new Date(date);
    let year: number;
    let month: number;
    let day: number;
    let hour: number;
    let minute: number;
    let second: number;
    let millisecond: number;

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

interface EscapeConfig {
    escapeDate?: typeof dateToString;
    escapeArray?: typeof arrayToList;
    escapeBuffer?: typeof bufferToString;
    escapeString?: typeof escapeString;
    escapeObject?: typeof escapeObject;
    wrap?: typeof wrapEscape;
}

export const makeEscape = (config: EscapeConfig = {}): any => {
    const finalEscapeDate = config.escapeDate || dateToString;
    const finalEscapeArray = config.escapeArray || arrayToList;
    const finalEscapeBuffer = config.escapeBuffer || bufferToString;
    const finalEscapeString = config.escapeString || escapeString;
    const finalEscapeObject = config.escapeObject || escapeObject;
    const finalWrap = config.wrap || wrapEscape;

    function escapeFn(val: any, finalEscape: any, ctx: EscapeContext): string {
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