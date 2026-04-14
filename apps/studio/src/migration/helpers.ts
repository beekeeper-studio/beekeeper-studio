import { UserSettingValueType } from "@/common/appdb/models/user_setting";
import type { QueryRunner } from "typeorm";

/**
 * Helper functions for database migrations
 */

/**
 * Options for adding a user setting
 */
export interface AddUserSettingOptions {
  /** Default value for all platforms */
  defaultValue: string;
  valueType: keyof typeof UserSettingValueType;
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
      ${userValue == null ? "NULL" : `'${userValue}'`},
      '${defaultValue}',
      '${linuxDefault}',
      '${macDefault}',
      '${windowsDefault}',
      ${UserSettingValueType[valueType]}
    )
  `;

  await runner.query(query);
}
