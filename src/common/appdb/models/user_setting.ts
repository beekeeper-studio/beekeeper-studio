import { ApplicationEntity } from "./application_entity";
import _ from 'lodash'
import platformInfo from '../../platform_info';

const { Entity, Column } = require("typeorm");

export interface IGroupedUserSettings {
  [x: string]: UserSetting
}

enum UserSettingValueType {
  string = 0,
  int = 1,
  float = 2,
  object = 3,
  array = 4,
  boolean = 5,
}

type UserSettingValue = string | number | boolean | Array<any> | object | null

const TypeDefaults = {
  0: "",
  1: 0,
  2: 0.0,
  3: {},
  4: [],
  5: false
}

const TypeConversion = {
  0: (v: string) => v, //string
  1: (v: string) => parseInt(v), // int
  2: (v: string) => parseFloat(v), // float
  3: (v: string) => JSON.parse(v), // object
  4: (v: string) => JSON.parse(v), // array
  5: (v: string) => v && v.toLowerCase() === 'true' // boolean
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

function setValue(updated: UserSettingValue): Nullable<string> {
  if (_.isNull(updated)) return null
  if (_.isString(updated)) {
    return updated
  }
  return JSON.stringify(updated)
}

@Entity({name: 'user_setting'})
export class UserSetting extends ApplicationEntity {
  static THEME = 'theme'
  static MenuStyle = 'menuStyle'

  static async all(): Promise<IGroupedUserSettings> {
    const settings = await UserSetting.find()
    return _(settings).groupBy('key').mapValues(vs => vs[0]).value() as IGroupedUserSettings
  }

  static async set(key: string, value: string) {
    let existing = await UserSetting.findOne({ key });
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

  _userValue: Nullable<string> = null
  @Column({type: 'varchar', nullable: false})
  set userValue(updated) {
    this._userValue = setValue(updated)
  }

  get userValue() {
    return getValue(this.valueType, this._userValue)
  }

  get value() {
    const raw = this._userValue || this.platformDefault || this.defaultValue
    return getValue(this.valueType, raw)
  }

  set value(updated) {
    this.userValue = updated
  }

  get platformDefault() {
    if (platformInfo.isMac) return this.macDefault
    if (platformInfo.isWindows) return this.windowsDefault
    return this.linuxDefault
  }

  @Column({type: 'varchar'})
  defaultValue: string = ''

  @Column({type: 'varchar'})
  linuxDefault?: string

  @Column({type: 'varchar'})
  macDefault?: string

  @Column({type: 'varchar'})
  windowsDefault?: string

  @Column({type: 'integer', nullable: false})
  valueType: UserSettingValueType = UserSettingValueType.string
}
