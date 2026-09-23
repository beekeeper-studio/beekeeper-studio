import crypto from 'crypto';
import { DBeaverCredentials } from './types';

// DBeaver encrypts credentials-config.json with a fixed AES key that ships in every
// build (BaseProjectImpl.LOCAL_KEY_CACHE), so no export step is needed to read
// saved passwords. File layout: 16 byte IV followed by AES-128-CBC/PKCS5 ciphertext.
export const DBEAVER_CREDENTIALS_KEY = Buffer.from('babb4a9f774ab853c96c2d653dfe544a', 'hex');

const IV_LENGTH = 16;

export function decryptDBeaverConfig(data: Buffer, key: Buffer = DBEAVER_CREDENTIALS_KEY): string {
  if (data.length <= IV_LENGTH || (data.length - IV_LENGTH) % 16 !== 0) {
    throw new Error('not an encrypted DBeaver configuration file');
  }
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, data.subarray(0, IV_LENGTH));
  return Buffer.concat([decipher.update(data.subarray(IV_LENGTH)), decipher.final()]).toString('utf8');
}

export function decryptDBeaverCredentials(data: Buffer, key?: Buffer): DBeaverCredentials {
  // A wrong key usually fails the padding check, but can also yield garbage
  // with valid padding, which JSON.parse then rejects.
  const parsed = JSON.parse(decryptDBeaverConfig(data, key));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('unexpected credentials format');
  }
  return parsed;
}
