// Reference: http://lollyrock.com/articles/nodejs-encryption
import crypto from 'crypto';

const algorithm = 'aes-256-ctr';

export function encrypt(text, secret) {
  const cipher = crypto.createCipher(algorithm, secret);
  let crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

export function decrypt(text, secret) {
  const decipher = crypto.createDecipher(algorithm, secret);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}
