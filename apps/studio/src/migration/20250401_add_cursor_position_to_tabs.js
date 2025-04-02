// add cursor position columns to tabs table

module.exports = async function(connection) {
  console.log("[20250401] Add cursor position to tabs");
  await connection.schema.alterTable('tabs', function(t) {
    t.integer('cursorIndex').nullable();
    t.integer('cursorIndexAnchor').nullable();
  });
}