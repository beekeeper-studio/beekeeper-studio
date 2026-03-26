/**
 * Encryption key cache for the utility process and model files.
 * The key is set once via setEncryptionKey() after receiving it from the main process over IPC,
 * then retrieved by model files via loadEncryptionKey().
 */

let _encryptionKey: Nullable<string> = null
let _insecure = false

/**
 * Stores the encryption key received from the main process.
 * Must be called before any ORM models are loaded.
 */
export function setEncryptionKey(key: string, insecure: boolean): void {
  _encryptionKey = key
  _insecure = insecure
}

/**
 * Returns the cached encryption key.
 * Throws if setEncryptionKey() has not been called yet.
 */
export function loadEncryptionKey(): string {
  if (!_encryptionKey) {
    throw new Error('loadEncryptionKey() called before setEncryptionKey() — the encryption key has not been received from the main process yet')
  }
  return _encryptionKey
}

export function isEncryptionKeyInsecure(): boolean {
  if (_encryptionKey === null) {
    return false
  }
  return _insecure
}
