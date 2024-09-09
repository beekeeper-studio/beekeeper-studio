export default {
  name: "20240909_add_license_modals",
  async run(runner) {
    const queries = [
      `INSERT INTO user_setting (key, defaultValue, valueType) VALUES
          -- ('openBeginTrialModal', 'true', 5),
          ('openEndLicenseModal', 'true', 5)
      `,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  },
};
