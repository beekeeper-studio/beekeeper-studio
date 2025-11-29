export default {
  name: '20251013_unique_name_formatter_presets',
  async run(runner) {
    // Create the formatter_presets table
    await runner.query(`
      CREATE UNIQUE INDEX idx_formatter_presets_name on formatter_presets(name);
    `);
  }
}
