export default {
  name: 'add-context-to-tabs',
  async run(runner) {
    const queries = [
      `
        ALTER TABLE tabs ADD COLUMN "context" text NULL DEFAULT '{}'
      `
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}