export default {
  name: '20220415-service-name',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN serviceName varchar(255) null default null`,
      `ALTER TABLE used_connection ADD COLUMN serviceName varchar(255) null default null`,
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}
