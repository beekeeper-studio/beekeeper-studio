/**
  * Extracted from https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/esnext.uint8-array.to-hex.js
  * FIXME we don't need this soon after `UInt8Array.prototype.toHex` is
  * implemented. See https://github.com/tc39/proposal-arraybuffer-base64
  */
export function uint8ArrayToHex(arr: Uint8Array): string {
  let result = '';
  for (var i = 0, length = arr.length; i < length; i++) {
    var hex = 1.0.toString.call(arr[i], 16);
    result += hex.length === 1 ? '0' + hex : hex;
  }
  return result;
}

function uncurryThis(fn: any): any {
  return function () {
    return Function.prototype.call.apply(fn, arguments);
  };
}

var min = Math.min;
var NOT_HEX = /[^\da-f]/i;
var exec = uncurryThis(NOT_HEX.exec);
var stringSlice = uncurryThis(''.slice);

/**
  * Extracted from https://github.com/zloirock/core-js/blob/master/packages/core-js/internals/uint8-from-hex.js
  * FIXME we don't need this soon after `UInt8Array.prototype.fromHex` is
  * implemented. See https://github.com/tc39/proposal-arraybuffer-base64
  */
export function hexToUint8Array(string: string, into?: any): Uint8Array {
  var stringLength = string.length;
  if (stringLength % 2 !== 0) throw new SyntaxError('String should be an even number of characters');
  var maxLength = into ? min(into.length, stringLength / 2) : stringLength / 2;
  var bytes = into || new Uint8Array(maxLength);
  var read = 0;
  var written = 0;
  while (written < maxLength) {
    var hexits = stringSlice(string, read, read += 2);
    if (exec(NOT_HEX, hexits)) throw new SyntaxError('String should only contain hex characters');
    bytes[written++] = parseInt(hexits, 16);
  }
  return bytes
}

type FriendlyUint8Array = Uint8Array & {
  toString(): string
  toJSON(): string
  toHex(): string
  toBase64(): string
}

/** Make `Uint8Array.toString` look better :D */
export function friendlyUint8Array(bytes: string, encoding: 'hex'): FriendlyUint8Array
export function friendlyUint8Array(bytes: Uint8Array): FriendlyUint8Array
export function friendlyUint8Array(bytes: string | Uint8Array, encoding?: 'hex'): FriendlyUint8Array {
  if (typeof bytes === 'string') {
    bytes = hexToUint8Array(bytes)
  }
  Object.assign(bytes, {
    toString() {
      return uint8ArrayToHex(this)
    },
    toJSON() {
      return uint8ArrayToHex(this)
    },
    toHex() {
      return uint8ArrayToHex(this)
    },
    toBase64() {
      return '[TODO]'
    }
  })
  return bytes as FriendlyUint8Array
}
