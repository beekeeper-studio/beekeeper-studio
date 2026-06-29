export default {
  name: '20260629_add_auto_save_to_tabs',
  async run(runner) {
    const queries = [
      `
        ALTER TABLE tabs ADD COLUMN "autoSave" boolean NOT NULL DEFAULT 0
      `
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}
