
export function splitQueries(queryText) {
  if (!queryText) return []
  const regex = /(?:[\n|\t])*.+?(?:[^;']|(?:'[^']+'))+;/gm
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