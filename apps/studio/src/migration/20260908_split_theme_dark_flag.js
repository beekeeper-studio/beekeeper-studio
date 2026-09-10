import { addUserSetting } from "./helpers";

export default {
  name: "20260908_split_theme_dark_flag",
  async run(runner) {
    await addUserSetting(runner, "themeId", {
      defaultValue: "default",
      valueType: "string",
    });

    await addUserSetting(runner, "themeDark", {
      defaultValue: "auto",
      valueType: "string",
    });

    await runner.query(
      `UPDATE user_setting SET userValue = (
        SELECT CASE COALESCE(theme.userValue, 'system')
          WHEN 'solarized' THEN 'solarized'
          WHEN 'solarized-dark' THEN 'solarized'
          ELSE 'default'
        END
        FROM user_setting theme WHERE theme.key = 'theme'
      ) WHERE key = 'themeId'`
    );

    await runner.query(
      `UPDATE user_setting SET userValue = (
        SELECT CASE COALESCE(theme.userValue, 'system')
          WHEN 'system' THEN 'auto'
          WHEN 'light' THEN 'false'
          WHEN 'dark' THEN 'true'
          WHEN 'solarized' THEN 'false'
          WHEN 'solarized-dark' THEN 'true'
          ELSE 'auto'
        END
        FROM user_setting theme WHERE theme.key = 'theme'
      ) WHERE key = 'themeDark'`
    );
  },
};
