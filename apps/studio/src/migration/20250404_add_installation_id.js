import { v4 as uuidv4 } from 'uuid';

export default {
  name: '20250404_add_installation_id',
  async run(runner) {
    // Create a new table to store the installation ID
    await runner.query(`
      CREATE TABLE IF NOT EXISTS installation_id (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        installation_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (datetime('now'))
      )
    `);
    
    // Generate a unique installation ID
    const installationId = uuidv4();
    
    // Insert the ID if the table is empty
    const existingRecord = await runner.query("SELECT * FROM installation_id LIMIT 1");
    if (existingRecord.length === 0) {
      await runner.query(
        "INSERT INTO installation_id (installation_id) VALUES (?)",
        [installationId]
      );
    }
    
    // Create a trigger to prevent deletion
    await runner.query(`
      CREATE TRIGGER IF NOT EXISTS prevent_installation_id_deletion
      BEFORE DELETE ON installation_id
      BEGIN
        SELECT RAISE(ABORT, 'Cannot delete installation ID record');
      END
    `);
    
    // Create a trigger to prevent updates
    await runner.query(`
      CREATE TRIGGER IF NOT EXISTS prevent_installation_id_update
      BEFORE UPDATE ON installation_id
      BEGIN
        SELECT RAISE(ABORT, 'Cannot update installation ID record');
      END
    `);
    
    // Create a trigger to prevent additional inserts beyond the first one
    await runner.query(`
      CREATE TRIGGER IF NOT EXISTS prevent_installation_id_insert
      BEFORE INSERT ON installation_id
      WHEN (SELECT COUNT(*) FROM installation_id) > 0
      BEGIN
        SELECT RAISE(ABORT, 'Installation ID already exists');
      END
    `);
  }
}