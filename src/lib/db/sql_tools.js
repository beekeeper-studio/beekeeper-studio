import _ from 'lodash'
import config from '../../config'

export function splitQueries(queryText) {
  if (!queryText) return []
  const regex = /(?:[^;']|(?:'[^']+'))+;/gm
  let value = queryText
  let fakeSemiColon = false
  if (!queryText.trim().endsWith(';')) {
    value += ';'
    fakeSemiColon = true
  }

  let m
  const queries = []
  while ((m = regex.exec(value)) !== null) {
    if (m.index === regex.lastIndex) {
      regex.lastIndex++
    }

    m.forEach((matched) => {

      // const toPush = matched.endsWith(';') ? matched.slice(0, matched.length-1) : matched
      queries.push(matched)
      // queries.push(toPush)
    })
  }
  if (fakeSemiColon) {
    const last = queries.length - 1
    queries[last] = queries[last].slice(0, queries[last].length -1)
  }
  return queries
}

export function extractParams(query) {
  if (!query) return []
  
  const result = Array.from(query.matchAll(/(?:\W|^)(:\w+|\$\d+)(?:\W|$)/g)).map(match => match[1])
  if (!result || result.length == 0) {
    return []
  }
  return _.uniq(result)
}

function resolveProtocol(protocol) {
  if (protocol.startsWith("http")) {
    return "mysql";
  }
  if (protocol.startsWith("postgres")) {
    return "postgresql";
  }
  let result = null
  config.defaults.connectionTypes.forEach( t => {
    if(protocol.includes(t.value)) result = t.value
  })

  if (result) return result
  throw new Error(`Unknown database protocol ${protocol}`)
}

export function parseConnectionUrl(connectionUrl) {
  console.log(connectionUrl)
  const url = new URL(connectionUrl)
  return {
    connectionType: resolveProtocol(url.protocol),
    host: url.hostname,
    port: parseInt(url.port),
    defaultDatabase: url.pathname.substr(1),
    username: url.username,
    password: url.password,
    ssl: url.search.includes("sslmode=require") || url.search.includes("sslmode=prefer"),
  }

}