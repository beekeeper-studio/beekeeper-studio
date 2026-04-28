import { ValueTransformer } from 'typeorm';
import Encryptor, { SimpleEncryptor } from 'simple-encryptor'
import { AzureAuthOptions } from '../models/saved_connection';
import { SurrealDBOptions } from '@/lib/db/types';
import _ from 'lodash'
import rawLog from '@bksLogger'

const log = rawLog.scope("Transformers")


/**
 * Base class for encryption transformers. Holds a lazy-initialized encryptor
 * keyed off a provider function — this lets subclasses defer key resolution
 * until the first encrypt/decrypt call (after safeStorage is ready).
 */
abstract class BaseEncryptTransformer {
  private _encryptor: SimpleEncryptor | null = null
  private keyProvider: () => string

  constructor(keyProvider: () => string) {
    this.keyProvider = keyProvider
  }

  protected get encryptor(): SimpleEncryptor {
    if (!this._encryptor) {
      this._encryptor = Encryptor(this.keyProvider())
    }
    return this._encryptor
  }
}

export class EncryptTransformer extends BaseEncryptTransformer implements ValueTransformer {
  to(entityValue: Nullable<string>): Nullable<string> {
    if( !entityValue ) return null
    return this.encryptor.encrypt(entityValue)
  }
  from(databaseValue: Nullable<string>): Nullable<string> {
    if (!databaseValue) return null
    return this.encryptor.decrypt(databaseValue)
  }
}

export class SurrealDbEncryptTransformer extends BaseEncryptTransformer implements ValueTransformer {
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

export class AzureCredsEncryptTransformer extends BaseEncryptTransformer implements ValueTransformer {
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
