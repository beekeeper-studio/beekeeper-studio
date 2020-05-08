// Copyright (c) 2015 The SQLECTRON Team
// Reference: http://lollyrock.com/articles/nodejs-encryption
import crypto from 'crypto';

const algorithm = 'aes-256-ctr';

export function encrypt(text, secret) {
  if (!secret) {
    throw new Error('Missing crypto secret');
  }

  const cipher = crypto.createCipher(algorithm, secret);
  let crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

export function decrypt(text, secret) {
  if (!secret) {
    throw new Error('Missing crypto secret');
  }

  const decipher = crypto.createDecipher(algorithm, secret);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Date.now() + Math.random() * 16) % 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);

    return value.toString(16);
  });
}
