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