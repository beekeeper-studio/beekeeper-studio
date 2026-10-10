import { addUserSetting } from './helpers'

export default {
  name: "20260929_add_confirm_window_close_setting",
  async run(runner) {
    await addUserSetting(runner, 'dontConfirmWindowClose', {
      defaultValue: 'false',
      valueType: "boolean",
    });
  }
}
