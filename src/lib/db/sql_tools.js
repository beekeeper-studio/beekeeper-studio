import _ from 'lodash'

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
  if (fakeSemiColon && queries.length > 0) {
    const last = queries.length - 1
    queries[last] = queries[last].slice(0, queries[last].length -1)
  }
  return queries
}

const badMatch = /(:\w+:)/g
const extractRegex = /(?:[^a-zA-Z0-9_:]|^)(:\w+:?|\$\d+)(?:\W|$)/g

export function extractParams(query) {
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
