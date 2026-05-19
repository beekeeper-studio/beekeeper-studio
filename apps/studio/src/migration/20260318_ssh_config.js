export default {
  name: '20260318_ssh_config',
  async run(runner) {
    // Create standalone ssh_config table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS ssh_config (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        host VARCHAR(255) NOT NULL DEFAULT '',
        port INTEGER,
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

    // Delete orphan ssh_config rows once no join still references them.
    // Fires for any DELETE path: app-level remove, FK cascade, or explicit SQL.
    await runner.query(
      `DROP TRIGGER IF EXISTS connection_ssh_config_cleanup_ssh_config`
    )
    await runner.query(`
      CREATE TRIGGER connection_ssh_config_cleanup_ssh_config
      AFTER DELETE ON connection_ssh_config
      FOR EACH ROW
      BEGIN
        DELETE FROM ssh_config
        WHERE id = OLD.sshConfigId
          AND NOT EXISTS (SELECT 1 FROM connection_ssh_config WHERE sshConfigId = OLD.sshConfigId);
      END
    `)
  }
}
