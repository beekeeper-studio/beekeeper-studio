import { addUserSetting } from './helpers'

export default {
  name: "20251021_add_window_maximized_setting",
  async run(runner) {
    await addUserSetting(runner, 'windowMaximized', {
      defaultValue: 'false',
      valueType: "boolean",
    });
  }
}
