import { addUserSetting } from "./helpers";

export default {
  name: "20260908_split_theme_dark_flag",
  async run(runner) {
    await addUserSetting(runner, "themeDark", {
      defaultValue: "match-system",
      valueType: "string",
    });

    await runner.query(
      `UPDATE user_setting SET userValue = (
        SELECT CASE COALESCE(theme.userValue, 'system')
          WHEN 'system' THEN 'match-system'
          WHEN 'light' THEN 'false'
          WHEN 'dark' THEN 'true'
          WHEN 'solarized' THEN 'false'
          WHEN 'solarized-dark' THEN 'true'
          ELSE 'match-system'
        END
        FROM user_setting theme WHERE theme.key = 'theme'
      ) WHERE key = 'themeDark'`
    );

    await runner.query(
      `UPDATE user_setting SET
        userValue = CASE COALESCE(userValue, 'system')
          WHEN 'solarized' THEN 'solarized'
          WHEN 'solarized-dark' THEN 'solarized'
          ELSE 'default'
        END,
        defaultValue = 'default',
        linuxDefault = 'default',
        macDefault = 'default',
        windowsDefault = 'default'
      WHERE key = 'theme'`
    );
  },
};
