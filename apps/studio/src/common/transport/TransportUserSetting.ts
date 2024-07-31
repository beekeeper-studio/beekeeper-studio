import { Transport } from ".";
import platformInfo from "../platform_info";
import _ from "lodash";

export interface IGroupedUserSettings {
  [x: string]: TransportUserSetting
}

export enum UserSettingValueType {
  string = 0,
  int = 1,
  float = 2,
  object = 3,
  array = 4,
  boolean = 5,
}

type UserSettingValue = string | number | boolean | Array<any> | Record<string, any> | null

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

function getVal(valueType: UserSettingValueType, valueString: Nullable<string>): UserSettingValue {
  if(valueString == null) return valueString
  try {
    const result = TypeConversion[valueType](valueString)
    return _.isNil(result) ? TypeDefaults[valueType] : result
  } catch (err) {
    return TypeDefaults[valueType]
  }
}

function setVal(updated: UserSettingValue): Nullable<string> {
  if (_.isNull(updated)) return null
  if (_.isBoolean(updated)) return updated ? 'true' : 'false'
  if (_.isString(updated)) {
    return updated
  }
  return JSON.stringify(updated)
}

export interface TransportUserSetting extends Transport {
  key: string,
  _userValue: Nullable<string>,
  defaultValue: string,
  linuxDefault?: string,
  macDefault?: string,
  windowsDefault?: string,
  valueType: UserSettingValueType
}

export function getValue(obj: TransportUserSetting): UserSettingValue {
  const raw = obj._userValue || getPlatformDefault(obj) || obj.defaultValue;
  return getVal(obj.valueType, raw);
}

export function setValue(obj: TransportUserSetting, updated: UserSettingValue): TransportUserSetting {
  obj._userValue = setVal(updated);
  return obj; 
}

export function getStringValue(obj: TransportUserSetting) {
  return getValue(obj).toString();
}

export function getPlatformDefault(obj: TransportUserSetting): string {
  if (platformInfo.isMac) return obj.macDefault
  if (platformInfo.isWindows) return obj.windowsDefault
  return obj.linuxDefault;
}
