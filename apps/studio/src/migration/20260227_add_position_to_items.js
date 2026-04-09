export default {
  name: '20260227_add_position_to_items',
  async run(runner) {
    await runner.query(
      'ALTER TABLE favorite_query ADD COLUMN position FLOAT NOT NULL DEFAULT 0'
    )
    // Assign sequential 1-based positions per folder, ordered by id
    await runner.query(`
      UPDATE favorite_query
      SET position = (
        SELECT COUNT(*) FROM favorite_query fq2
        WHERE fq2.queryFolderId = favorite_query.queryFolderId
          AND fq2.id <= favorite_query.id
      )
    `)
    await runner.query(
      'ALTER TABLE saved_connection ADD COLUMN position FLOAT NOT NULL DEFAULT 0'
    )
    await runner.query(`
      UPDATE saved_connection
      SET position = (
        SELECT COUNT(*) FROM saved_connection sc2
        WHERE sc2.connectionFolderId = saved_connection.connectionFolderId
          AND sc2.id <= saved_connection.id
      )
    `)
  }
}
