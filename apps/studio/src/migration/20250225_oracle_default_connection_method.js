export default {
  name: "20250225_oracle_default_connection_method",
  async run(runner) {
    // update oracle connections with manual connectionMethod when none exists
    // if any value is set, there's already a connectionMethod set (possibly)
    const queries = [
      `
        UPDATE saved_connection
        SET options = '{ "connectionMethod": "manual" }'
        WHERE options NOT LIKE '%connectionString%'
      `,
      `
        UPDATE saved_connection
        SET options = json_set(options, '$.connectionMethod', 'connectionString')
        WHERE options is not null
        AND json_extract(options, '$.connectionString') IS NOT NULL
      `
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
}
