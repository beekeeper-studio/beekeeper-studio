import { ApplicationEntity } from "./application_entity";
import _ from 'lodash'
import platformInfo from '../../platform_info';
import { Entity, Column } from 'typeorm'
import { loadEncryptionKey } from "@/common/encryption_key";
import Encryptor from 'simple-encryptor';

export interface IGroupedUserSettings {
  [x: string]: UserSetting
}

export enum UserSettingValueType {
  string = 0,
  int = 1,
  float = 2,
  object = 3,
  array = 4,
  boolean = 5,
  encrypted = 6
}

type UserSettingValue = string | number | boolean | Array<any> | Record<string, any> | null

const encryptor = Encryptor(loadEncryptionKey());

const TypeDefaults = {
  0: "",
  1: 0,
  2: 0.0,
  3: {},
  4: [],
  5: false,
  6: ""
}

const TypeConversion = {
  0: (v: string) => v, //string
  1: (v: string) => parseInt(v), // int
  2: (v: string) => parseFloat(v), // float
  3: (v: string) => JSON.parse(v), // object
  4: (v: string) => JSON.parse(v), // array
  5: (v: string) => v && v.toLowerCase() === 'true', // boolean
  6: (v: string) => encryptor.decrypt(v), // encrypted
}

function getValue(valueType: UserSettingValueType, valueString: Nullable<string>): UserSettingValue {
  if(valueString == null) return valueString
  try {
    const result = TypeConversion[valueType](valueString)
    return _.isNil(result) ? TypeDefaults[valueType] : result
  } catch (err) {
    return TypeDefaults[valueType]
  }
}

function setValue(valueType: UserSettingValueType, updated: UserSettingValue): Nullable<string> {
  if (valueType == UserSettingValueType.encrypted) {
    return encryptor.encrypt(updated);
  }

  if (_.isNull(updated)) return null
  if (_.isBoolean(updated)) return updated ? 'true' : 'false'
  if (_.isString(updated)) {
    return updated
  }
  return JSON.stringify(updated)
}

@Entity({name: 'user_setting'})
export class UserSetting extends ApplicationEntity {
  withProps(props?: any): UserSetting {
    if (props) UserSetting.merge(this, props);
    return this;
  }

  static THEME = 'theme'

  static async all(): Promise<IGroupedUserSettings> {
    const settings = await UserSetting.find()
    return _(settings).groupBy('key').mapValues(vs => vs[0]).value() as IGroupedUserSettings
  }

  static async get(key: string) {
    return await UserSetting.findOneBy({ key })
  }

  static async set(key: string, value: string): Promise<void> {
    let existing = await UserSetting.findOneBy({ key });
    if (!existing) {
      existing = new UserSetting()
      existing.key = key
      existing.defaultValue = value
    }
    existing.userValue = value
    await existing.save()
  }


  @Column({type: 'varchar', nullable: false, unique: true})
  key!: string

  @Column({ type: 'varchar', nullable: false, name: 'userValue' })
  _userValue: Nullable<string> = null

  set userValue(updated: UserSettingValue) {
    this._userValue = setValue(this.valueType, updated)
  }

  get userValue(): UserSettingValue {
    return getValue(this.valueType, this._userValue)
  }

  get value(): UserSettingValue {
    const raw = this._userValue || this.platformDefault || this.defaultValue
    return getValue(this.valueType, raw)
  }

  set value(updated: UserSettingValue) {
    this.userValue = updated
  }

  get valueAsBool() {
    return !!this.value
  }

  get stringValue() {
    return this.value.toString()
  }

  get platformDefault(): string {
    if (platformInfo.isMac) return this.macDefault
    if (platformInfo.isWindows) return this.windowsDefault
    return this.linuxDefault
  }

  @Column({type: 'varchar'})
  defaultValue = ''

  @Column({type: 'varchar'})
  linuxDefault?: string

  @Column({type: 'varchar'})
  macDefault?: string

  @Column({type: 'varchar'})
  windowsDefault?: string


  @Column({type: 'integer', nullable: false})
  valueType: UserSettingValueType = UserSettingValueType.string
}
