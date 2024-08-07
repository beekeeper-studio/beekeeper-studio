export default {
  name: '20220401-trust-server-certificate',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN trustServerCertificate boolean not null default false`,
      `ALTER TABLE used_connection ADD COLUMN trustServerCertificate boolean not null default false`,
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}
