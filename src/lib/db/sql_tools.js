import _ from 'lodash'

export function splitQueries(queryText) {
  if (!queryText) return []
  const regex = /(?:[^;']|(?:'[^']+'))+;/gm
  let value = queryText
  if (!queryText.trim().endsWith(';')) {
    value += ';'
  }

  let m
  const queries = []
  while ((m = regex.exec(value)) !== null) {
    if (m.index === regex.lastIndex) {
      regex.lastIndex++
    }

    m.forEach((matched) => {

      const toPush = matched.endsWith(';') ? matched.slice(0, matched.length-1) : matched
      queries.push(toPush)
    })
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