export default {
  name: '20260318_ssh_config',
  async run(runner) {
    // Create standalone ssh_config table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS ssh_config (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        host VARCHAR(255) NOT NULL DEFAULT '',
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

    // Create join table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS connection_ssh_config (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        connectionId INTEGER NOT NULL REFERENCES saved_connection(id) ON DELETE CASCADE,
        sshConfigId INTEGER NOT NULL REFERENCES ssh_config(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `)

    // Migrate sshBastionHost as position-0 entry
    await runner.query(`
      INSERT INTO ssh_config (host, port, mode, username, password, keyfile, keyfilePassword)
      SELECT sshBastionHost, 22, COALESCE(sshMode, 'agent'), sshUsername, sshPassword, sshKeyfile, sshKeyfilePassword
      FROM saved_connection
      WHERE sshBastionHost IS NOT NULL AND sshBastionHost != ''
    `)
    await runner.query(`
      INSERT INTO connection_ssh_config (connectionId, sshConfigId, position)
      SELECT sc.id, ssh.id, 0
      FROM saved_connection sc
      JOIN ssh_config ssh ON ssh.host = sc.sshBastionHost
      WHERE sc.sshBastionHost IS NOT NULL AND sc.sshBastionHost != ''
    `)

    // Migrate sshHost as the last (target) entry
    await runner.query(`
      INSERT INTO ssh_config (host, port, mode, username, password, keyfile, keyfilePassword)
      SELECT sshHost, COALESCE(sshPort, 22), COALESCE(sshMode, 'agent'), sshUsername, sshPassword, sshKeyfile, sshKeyfilePassword
      FROM saved_connection
      WHERE sshEnabled = 1 AND sshHost IS NOT NULL AND sshHost != ''
    `)
    await runner.query(`
      INSERT INTO connection_ssh_config (connectionId, sshConfigId, position)
      SELECT sc.id, ssh.id, COALESCE(existing.maxPos + 1, 0)
      FROM saved_connection sc
      JOIN ssh_config ssh ON ssh.host = sc.sshHost
      LEFT JOIN (
        SELECT connectionId, MAX(position) AS maxPos FROM connection_ssh_config GROUP BY connectionId
      ) existing ON existing.connectionId = sc.id
      WHERE sc.sshEnabled = 1 AND sc.sshHost IS NOT NULL AND sc.sshHost != ''
    `)
  }
}
