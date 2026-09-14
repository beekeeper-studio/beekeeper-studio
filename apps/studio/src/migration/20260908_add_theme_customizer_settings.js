import { addUserSetting } from "./helpers";

const defaultColors = {
  gray: "#000000",
  yellow: "#fad83b",
  blue: "#3498db",
  green: "#15db95",
  orange: "#ff8d21",
  red: "#ff5d59",
  purple: "#9858ff",
  pink: "#ff78f7",
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
