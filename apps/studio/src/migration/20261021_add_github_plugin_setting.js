import { addUserSetting } from "./helpers"

export default {
  name: "20261021_add_github_plugin_setting",
  async run(runner) {
    await addUserSetting(runner, "pluginGithubToken", {
      valueType: "encrypted",
      defaultValue: ""
    });
  }
}
