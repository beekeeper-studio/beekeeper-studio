export default {
  name: '20260519_ssh_config',
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

    // Backfill ssh_config + connection_ssh_config from the legacy saved_connection columns.
    // Encrypted password columns are copied byte-for-byte; both tables share one encryption key.
    await runner.query(`ALTER TABLE ssh_config ADD COLUMN _migration_connection_id INTEGER`)
    await runner.query(`ALTER TABLE ssh_config ADD COLUMN _migration_position INTEGER`)

    await runner.query(`
      INSERT INTO ssh_config (
        host, port, mode, username, password, keyfile, keyfilePassword,
        version, createdAt, updatedAt,
        _migration_connection_id, _migration_position
      )
      SELECT
        sshBastionHost,
        sshBastionHostPort,
        COALESCE(NULLIF(sshBastionMode, ''), 'agent'),
        sshBastionUsername,
        sshBastionPassword,
        sshBastionKeyfile,
        sshBastionKeyfilePassword,
        0,
        datetime('now'),
        datetime('now'),
        id,
        0
      FROM saved_connection
      WHERE sshEnabled = 1
        AND sshBastionHost IS NOT NULL
        AND sshBastionHost != ''
        AND NOT EXISTS (SELECT 1 FROM connection_ssh_config WHERE connectionId = saved_connection.id)
    `)

    await runner.query(`
      INSERT INTO ssh_config (
        host, port, mode, username, password, keyfile, keyfilePassword,
        version, createdAt, updatedAt,
        _migration_connection_id, _migration_position
      )
      SELECT
        sshHost,
        sshPort,
        COALESCE(NULLIF(sshMode, ''), 'agent'),
        sshUsername,
        sshPassword,
        sshKeyfile,
        sshKeyfilePassword,
        0,
        datetime('now'),
        datetime('now'),
        id,
        1
      FROM saved_connection
      WHERE sshEnabled = 1
        AND sshHost IS NOT NULL
        AND sshHost != ''
        AND NOT EXISTS (SELECT 1 FROM connection_ssh_config WHERE connectionId = saved_connection.id)
    `)

    await runner.query(`
      INSERT INTO connection_ssh_config (
        connectionId, sshConfigId, position,
        version, createdAt, updatedAt
      )
      SELECT _migration_connection_id, id, _migration_position,
             0, datetime('now'), datetime('now')
      FROM ssh_config
      WHERE _migration_connection_id IS NOT NULL
    `)

    await runner.query(`ALTER TABLE ssh_config DROP COLUMN _migration_connection_id`)
    await runner.query(`ALTER TABLE ssh_config DROP COLUMN _migration_position`)
  }
}
