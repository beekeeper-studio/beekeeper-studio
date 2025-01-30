import platformInfo from '@/common/platform_info'
import rawLog from '@bksLogger'
import { copyFileSync } from 'fs'
import path from 'path'

const log = rawLog.scope('migrations/seed')

function escapeString(value, quote) {
  if (!value) return null
  const result = `${value.toString().replaceAll(/'/g, "''")}`
  return quote ? `'${result}'` : result
}


const demoQuerySql = escapeString(`
-- You can run this script directly to see how data is queried in this database.
-- Press "ctrl/cmd+enter" to run the query and see the results. Yum.

SELECT
    cheeses.name AS Cheese,
    cheeses.cheese_type AS Type,
    cheeses.description AS Description,
    countries.name AS OriginCountry
FROM
    cheeses
JOIN
    countries ON cheeses.origin_country_id = countries.id;


-- Other stuff to try:
-- <= Double click tables to view (and edit!) their data
-- <= Right click a table and click 'Export to file' to make a CSV
-- <= Click the <> Icon in the right sidebar to see saved queries

-- Links:
-- Beekeeper Studio Docs: https://docs.beekeeperstudio.io
-- Website: https://beekeeperstudio.io

`, true)


export default {
  name: "20240421_seed_with_demo_data",
  async run(runner) {


    const check = "select * from used_connection limit 1"
    const result = await runner.query(check)
    if (result.length > 0) {
      log.info("Not adding seed data, used connections exist")
      return
    }

    // this really shouldn't be part of a migration, but 🤷

    const badPath = path.join(platformInfo.resourcesPath, 'demo.db')
    const filePath = path.join(platformInfo.userDirectory, 'demo.db')

    await copyFileSync(badPath, filePath)

    const filePathSQL = escapeString(filePath, true)
    const scQ = `
      INSERT INTO saved_connection(name,connectionType,host,defaultDatabase, version, uniqueHash)
      VALUES('Demo Database', 'sqlite', 'localhost', ${filePathSQL}, 1, 'DEPRECATED') RETURNING id
    `
    const fqQ = `
      INSERT INTO favorite_query(title, text, version, database, connectionHash) VALUES('Demo Query', ${demoQuerySql}, 1, '[blank]', 'DEPRECATED') RETURNING id
    `
    const connectionIds = await runner.query(scQ)
    log.info('connection returned', connectionIds)
    const connectionId = connectionIds?.[0].id
    const idRes = await runner.query(fqQ)
    log.info('fq returned', idRes)
    const id = idRes?.[0].id
    const tabQuery = `
      INSERT INTO tabs(title, queryId, unsavedChanges, version, connectionId, position, tabType) VALUES('Demo Query', ${id}, false, 1, ${connectionId}, 99.0, 'query')
    `
    await runner.query(tabQuery)
  }
};
