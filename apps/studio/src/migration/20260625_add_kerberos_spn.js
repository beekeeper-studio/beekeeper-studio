export default {
  name: '20260625-kerberos-spn',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN kerberosSpn varchar`,
      `ALTER TABLE used_connection ADD COLUMN kerberosSpn varchar`,
    ]
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i])
    }
  }
}
