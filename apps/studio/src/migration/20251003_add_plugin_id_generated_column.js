export default {
  name: '20251003_add_plugin_id_generated_column',
  async run(runner) {
    const queries = [
      `ALTER TABLE tabs ADD COLUMN "generatedPluginId" TEXT`,
      `UPDATE tabs SET generatedPluginId = json_extract(context, '$.pluginId') WHERE context IS NOT NULL AND json_valid(context) = 1`,
      `CREATE INDEX idx_tabs_generated_plugin_id ON tabs(tabType, generatedPluginId)`
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}
