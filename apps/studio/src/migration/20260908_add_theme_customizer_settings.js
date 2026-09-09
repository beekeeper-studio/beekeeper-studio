import { addUserSetting } from "./helpers";

const defaultColors = {
  gray: "#000000",
  primary: "#fad83b",
  info: "#3498db",
  success: "#15db95",
  warning: "#ff8d21",
  danger: "#ff5d59",
  background: "#ffffff",
};

export default {
  name: "20260908_add_theme_customizer_settings",
  async run(runner) {
    await addUserSetting(runner, "themeCustomizerPosition", {
      defaultValue: "bottom-right",
      valueType: "string",
    });

    await addUserSetting(runner, "themeCustomizerColors", {
      defaultValue: JSON.stringify(defaultColors),
      valueType: "string",
    });
  },
};
