import { Transport } from ".";
import _ from "lodash";

export interface IGroupedUserSettings {
  [x: string]: TransportUserSetting
}

export type UserSettingValue = string | number | boolean | Array<any> | Record<string, any> | null

export enum UserSettingValueType {
  string = 0,
  int = 1,
  float = 2,
  object = 3,
  array = 4,
  boolean = 5,
}

export interface TransportUserSetting extends Transport {
  key: string,
  value: UserSettingValue,
  defaultValue: string,
  linuxDefault?: string,
  macDefault?: string,
  windowsDefault?: string,
  valueType: UserSettingValueType
}
