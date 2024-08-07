export default {
  name: "20220408-add-socket-path",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN socketPathEnabled boolean not null default false`,
      `ALTER TABLE used_connection ADD COLUMN socketPathEnabled boolean not null default false`,
      `ALTER TABLE saved_connection ADD COLUMN socketPath varchar(255) null`,
      `ALTER TABLE used_connection ADD COLUMN socketPath varchar(255) null`
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
