import { addUserSetting } from './helpers'

export default {
  name: "20261124_add_show_column_data_types_setting",
  async run(runner) {
    await addUserSetting(runner, 'showColumnDataTypes', {
      defaultValue: 'true',
      valueType: "boolean",
    });
  }
}
