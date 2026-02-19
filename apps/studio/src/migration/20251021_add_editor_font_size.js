export default {
  name: "20251021_add_editor_font_size",
  async run(runner) {
    const query = `
      INSERT OR IGNORE INTO user_setting (key, defaultValue, valueType) VALUES
        ('editorFontSize', '14', '1')
    `;
    await runner.query(query);
  }
}
