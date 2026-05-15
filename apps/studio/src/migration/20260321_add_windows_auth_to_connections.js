export default {
  name: '20260321-windows-auth-enabled',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN windowsAuthEnabled boolean not null default false`,
      `ALTER TABLE used_connection ADD COLUMN windowsAuthEnabled boolean not null default false`,
    ]
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i])
    }
  }
}
