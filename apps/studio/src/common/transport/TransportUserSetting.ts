import { Transport } from ".";
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
  value: UserSettingValue,
  defaultValue: string,
  linuxDefault?: string,
  macDefault?: string,
  windowsDefault?: string,
  valueType: UserSettingValueType
}

export function setValue(obj: TransportUserSetting, updated: UserSettingValue): TransportUserSetting {
  obj._userValue = setVal(updated);
  return obj; 
}
