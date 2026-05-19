import { SshConfig } from "../common/appdb/models/SshConfig";

export default {
  name: "20260518_ssh_config_orphan_cleanup",
  async run(runner) {
    // Delete orphan ssh_config rows once no join still references them.
    // Fires for any DELETE path: app-level remove, FK cascade from parent connection delete,
    // or explicit SQL.
    await runner.query(
      `DROP TRIGGER IF EXISTS connection_ssh_config_cleanup_ssh_config`
    );
    await runner.query(`
      CREATE TRIGGER connection_ssh_config_cleanup_ssh_config
      AFTER DELETE ON connection_ssh_config
      FOR EACH ROW
      BEGIN
        DELETE FROM ssh_config
        WHERE id = OLD.sshConfigId
          AND NOT EXISTS (SELECT 1 FROM connection_ssh_config WHERE sshConfigId = OLD.sshConfigId);
      END
    `);
  },
};
