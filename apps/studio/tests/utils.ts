/**
 * Create a buffer from hex string
 *
 * Usage:
 *
 * ```js
 * import { buffer as b } from '@tests/utils'
 * b`beef` // like 0xbeef
 * ````
 **/
export function buffer(strings: TemplateStringsArray, ...values: string[]) {
  const arr = hexStringToNumbers(combineTemplateStrings(strings, ...values));
  return Buffer.from(arr);
}

/**
 * Create a Uint8Array from hex string
 *
 * Usage:
 *
 * ```js
 * import { uint8 as u } from '@tests/utils'
 * u`beef` // like 0xbeef
 * ````
 **/
export function uint8(strings: TemplateStringsArray, ...values: string[]) {
  const arr = hexStringToNumbers(combineTemplateStrings(strings, ...values));
  return Uint8Array.from(arr)
}

function combineTemplateStrings(strings: TemplateStringsArray, ...values: string[]) {
  return strings.reduce((acc, str, index) => {
    return acc + str + (values[index] !== undefined ? values[index] : '');
  }, '');
}

function hexStringToNumbers(hex: string) {
  if (hex === '') return []
  return hex.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16));
}
