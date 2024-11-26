export default {
  name: "20241115-delete-duplicate_connections",
  async run(runner) {
    const query = `
      DELETE FROM used_connection
      WHERE rowid NOT IN (
          SELECT rowid
          FROM used_connection AS uc
          WHERE (uc.connectionId, uc.updatedAt) IN (
              SELECT connectionId, MAX(updatedAt)
              FROM used_connection
              WHERE connectionId IS NOT NULL
              GROUP BY connectionId
          )
      ) AND connectionId IS NOT NULL;
    `;
    await runner.query(query);
  }
}
