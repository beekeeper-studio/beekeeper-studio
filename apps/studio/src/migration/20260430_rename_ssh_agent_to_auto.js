export default {
  name: "20260430-rename-ssh-agent-to-auto",
  async run(runner) {
    const queries = [
      `UPDATE saved_connection SET sshMode = 'auto' WHERE sshMode = 'agent'`,
      `UPDATE saved_connection SET sshBastionMode = 'auto' WHERE sshBastionMode = 'agent'`,
      `UPDATE used_connection SET sshMode = 'auto' WHERE sshMode = 'agent'`,
      `UPDATE used_connection SET sshBastionMode = 'auto' WHERE sshBastionMode = 'agent'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i]);
    }
  }
};
