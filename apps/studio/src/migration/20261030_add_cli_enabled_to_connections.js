export default {
  name: '20261030-cli-enabled',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN cliEnabled boolean not null default false`,
      `ALTER TABLE used_connection ADD COLUMN cliEnabled boolean not null default false`,
    ]
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i])
    }
  }
}
