export default {
  name: "20240909_add_license_modals",
  async run(runner) {
    const queries = [
      `INSERT INTO user_setting (key, defaultValue, valueType) VALUES
          ('openBeginTrialModal', 'true', 5), -- If true, show the begin TRIAL Modal when the license expires. If false, don't show it.
          ('openExpiredLicenseModal', 'true', 5) -- Same as above, but for all expired licenses not just TRIAL.
      `,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  },
};
