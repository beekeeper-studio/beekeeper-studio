export default {
  name: '20250604_create_user_pins',
  async run(runner) {
    // Create the user_pins table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS user_pins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create a trigger to prevent deletion
    await runner.query(`
      CREATE TRIGGER IF NOT EXISTS prevent_user_pin_deletion
      BEFORE DELETE ON user_pins
      BEGIN
        SELECT RAISE(ABORT, 'Cannot delete user pin record');
      END
    `);
  }
}
