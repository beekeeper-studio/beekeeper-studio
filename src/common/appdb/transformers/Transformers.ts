import { ValueTransformer } from 'typeorm';
import Encryptor, { SimpleEncryptor } from 'simple-encryptor'


export class EncryptTransformer implements ValueTransformer {
  private encryptor: SimpleEncryptor
  
  constructor(key: string) {
    this.encryptor = Encryptor(key)
  }

  to(entityValue: Nullable<string>): Nullable<string> {
    if( !entityValue ) return null
    return this.encryptor.encrypt(entityValue)
  }
  from(databaseValue: Nullable<string>): Nullable<string> {
    if (!databaseValue) return null
    return this.encryptor.decrypt(databaseValue)
  }
}
