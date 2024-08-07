export default {
  name: "20220709-add-keepalive_interval",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN sshKeepaliveInterval int(11) null DEFAULT 60`,
      `ALTER TABLE used_connection  ADD COLUMN sshKeepaliveInterval int(11) null DEFAULT 60`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
