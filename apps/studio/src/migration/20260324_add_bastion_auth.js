export default {
  name: "20260324-add-bastion-auth",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN sshBastionHostPort int(11) null DEFAULT null`,
      `ALTER TABLE saved_connection ADD COLUMN sshBastionMode varchar(8) not null DEFAULT 'agent'`,
      `ALTER TABLE saved_connection ADD COLUMN sshBastionUsername varchar(255) null DEFAULT null`,
      `ALTER TABLE saved_connection ADD COLUMN sshBastionKeyfile varchar(255) null DEFAULT null`,
      `ALTER TABLE saved_connection ADD COLUMN sshBastionPassword varchar(255) null DEFAULT null`,
      `ALTER TABLE saved_connection ADD COLUMN sshBastionKeyfilePassword varchar(255) null DEFAULT null`,
      `ALTER TABLE used_connection ADD COLUMN sshBastionHostPort int(11) null DEFAULT null`,
      `ALTER TABLE used_connection ADD COLUMN sshBastionMode varchar(8) not null DEFAULT 'agent'`,
      `ALTER TABLE used_connection ADD COLUMN sshBastionUsername varchar(255) null DEFAULT null`,
      `ALTER TABLE used_connection ADD COLUMN sshBastionKeyfile varchar(255) null DEFAULT null`,
    ];
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i]);
    }
  }
};
