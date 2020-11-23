import _ from 'lodash'
import { identify } from 'sql-query-identifier'

export function splitQueries(queryText: string) {
  if(_.isEmpty(queryText.trim())) {
    return []
  }
  const result = identify(queryText, { strict: false })
  return result
}

const badMatch = /(:\w+:)|(:\s*null)/g
const extractRegex = /(?:[^a-zA-Z0-9_:]|^)(:\w+:?|\$\d+)(?:\W|$)/g

export function extractParams(query: string) {
  if (!query) return []

  const result = Array.from(query.matchAll(extractRegex))
    .map(match => match[1])
    .filter(m => {
      return Array.from(m.matchAll(badMatch)).length === 0
    })
  if (!result || result.length == 0) {
    return []
  }

  return _.uniq(result)
}
