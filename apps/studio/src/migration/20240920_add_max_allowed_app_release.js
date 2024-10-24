export default {
  name: "20240920-max-allowed-app-release",
  async run(runner) {
    const queries = [
      `ALTER TABLE license_keys ADD COLUMN maxAllowedAppRelease json`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
