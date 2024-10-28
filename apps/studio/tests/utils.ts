/**
 * Create a buffer from hex string
 *
 * Usage:
 *
 * ```js
 * import { buffer as b } from '@tests/utils'
 * b`beef` // Buffer.from([0xbe, 0xef])
 * ````
 **/
export function buffer(strings: TemplateStringsArray, ...values: string[]) {
  // Concatenate the strings and values
  const combined = strings.reduce((acc, str, index) => {
    return acc + str + (values[index] !== undefined ? values[index] : '');
  }, '');
  // Split the combined string into groups of 2 characters
  const arr = combined.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16));
  return Buffer.from(arr);
}

