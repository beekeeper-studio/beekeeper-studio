export default {
  name: "20221103-add-readonly",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN readOnlyMode boolean not null default false`,
      `ALTER TABLE used_connection  ADD COLUMN readOnlyMode boolean not null default false`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};