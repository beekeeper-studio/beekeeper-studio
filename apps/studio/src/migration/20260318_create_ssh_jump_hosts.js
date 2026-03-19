export default {
  name: '20260318_create_ssh_jump_hosts',
  async run(runner) {
    // Create the ssh_jump_host table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS ssh_jump_host (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        connectionId INTEGER NOT NULL REFERENCES saved_connection(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL DEFAULT 22,
        mode VARCHAR(8) NOT NULL DEFAULT 'agent',
        username VARCHAR(255),
        password VARCHAR(255),
        keyfile VARCHAR(255),
        keyfilePassword VARCHAR(255),
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `)

    // Migrate existing sshBastionHost data:
    // For each saved_connection with a non-null/non-empty sshBastionHost,
    // insert it as position-0 jump host using the connection's existing auth credentials.
    await runner.query(`
      INSERT INTO ssh_jump_host (connectionId, position, host, port, mode, username, password, keyfile, keyfilePassword)
      SELECT
        id,
        0,
        sshBastionHost,
        22,
        COALESCE(sshMode, 'agent'),
        sshUsername,
        sshPassword,
        sshKeyfile,
        sshKeyfilePassword
      FROM saved_connection
      WHERE sshBastionHost IS NOT NULL AND sshBastionHost != ''
    `)
  }
}
