export default {
  name: '20201231-sslreject',
  async run(runner) {
    await runner.query('ALTER TABLE saved_connection ADD COLUMN sslRejectUnauthorized boolean not null default true')
    await runner.query('ALTER TABLE used_connection ADD COLUMN sslRejectUnauthorized boolean not null default true')
  }
}
