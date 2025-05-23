export default {
  name: "20250523_add_preinstalled_plugins",
  async run(runner) {
    const query = `
      -- installedPreinstalledPlugins - This is to avoid installing preinstalled
      -- plugins that are already installed.
      INSERT INTO user_setting(key, defaultValue, valueType)
        VALUES ('installedPreinstalledPlugins', '[]', 4)
    `;
    await runner.query(query);
  }
}
