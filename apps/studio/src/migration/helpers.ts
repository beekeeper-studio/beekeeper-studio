import type { QueryRunner } from "typeorm";

/**
 * Helper functions for database migrations
 */

/**
 * Value types for user settings
 */
export enum UserSettingValueType {
  string = 0,
  int = 1,
  float = 2,
  object = 3,
  array = 4,
  boolean = 5,
}

/**
 * Options for adding a user setting
 */
export interface AddUserSettingOptions {
  /** Default value for all platforms */
  defaultValue: string;
  /** Value type from UserSettingValueType enum */
  valueType: UserSettingValueType;
  /** Optional user value */
  userValue?: string | null;
  /** Optional Linux-specific default */
  linuxDefault?: string;
  /** Optional Mac-specific default */
  macDefault?: string;
  /** Optional Windows-specific default */
  windowsDefault?: string;
}

/**
 * Setting configuration for batch operations
 */
export interface UserSettingConfig {
  key: string;
  options: AddUserSettingOptions;
}

/**
 * Helper to create a user setting insertion migration
 */
export async function addUserSetting(
  runner: QueryRunner,
  key: string,
  options: AddUserSettingOptions
): Promise<void> {
  let {
    defaultValue,
    valueType,
    userValue = null,
    linuxDefault = defaultValue,
    macDefault = defaultValue,
    windowsDefault = defaultValue,
  } = options;

  // Validate required fields
  if (!key || defaultValue === undefined || valueType === undefined) {
    throw new Error(
      `Missing required fields for user setting: key=${key}, defaultValue=${defaultValue}, valueType=${valueType}`
    );
  }

  const query = `
    INSERT INTO user_setting(
      key,
      userValue,
      defaultValue,
      linuxDefault,
      macDefault,
      windowsDefault,
      valueType
    ) VALUES (
      '${key}',
      ${_.isNil(userValue) ? "NULL" : `'${userValue}'`},
      '${defaultValue}',
      '${linuxDefault}',
      '${macDefault}',
      '${windowsDefault}',
      ${valueType}
    )
  `;

  await runner.query(query);
}

/**
 * Helper to create multiple user setting insertion migrations at once
 */
export async function addUserSettings(
  runner: QueryRunner,
  settings: UserSettingConfig[]
): Promise<void> {
  for (const { key, options } of settings) {
    await addUserSetting(runner, key, options);
  }
}
