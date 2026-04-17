import { ValueTransformer } from 'typeorm';
import Encryptor, { SimpleEncryptor } from 'simple-encryptor'
import { AzureAuthOptions } from '../models/saved_connection';
import { SurrealDBOptions } from '@/lib/db/types';
import _ from 'lodash'
import rawLog from '@bksLogger'

const log = rawLog.scope("Transformers")


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

export class SurrealDbEncryptTransformer implements ValueTransformer {
  private encryptor: SimpleEncryptor;

  constructor(key: string) {
    this.encryptor = Encryptor(key);
  }

  to(value: SurrealDBOptions): SurrealDBOptions {
    const newVal = _.cloneDeep(value)
    if (newVal?.token) {
      newVal.token = this.encryptor.encrypt(value.token);
    }

    return newVal;
  }

  from(value: SurrealDBOptions): SurrealDBOptions {
    if (value?.token) {
      value.token = this.encryptor.decrypt(value.token);
    }

    return value;
  }

}

export class AzureCredsEncryptTransformer implements ValueTransformer {
  private encryptor: SimpleEncryptor;

  constructor(key: string) {
    this.encryptor = Encryptor(key);
  }

  to(value: AzureAuthOptions): AzureAuthOptions {
    const newVal = _.cloneDeep(value);
    if (newVal?.tenantId) {
      newVal.tenantId = this.encryptor.encrypt(newVal.tenantId);
    }

    if (newVal?.clientSecret) {
      newVal.clientSecret = this.encryptor.encrypt(newVal.clientSecret);
    }

    return newVal;
  }

  from(value: AzureAuthOptions): AzureAuthOptions {
    if (value?.tenantId) {
      value.tenantId = this.encryptor.decrypt(value.tenantId);
    }

    if (value?.clientSecret) {
      value.clientSecret = this.encryptor.decrypt(value.clientSecret);
    }
    return value;
  }
}
