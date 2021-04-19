
interface MagicColumn {
  friendlyColumnName: string,
  tableLink?: {
    table: string
    schema?: string
  }
  formatLink?: boolean
  

}

export function buildMagicColumn(columnName: string): MagicColumn | null {
  const magicOptions = columnName.split('__');
  if (magicOptions.length == 0) {
    return null;
  }

  if (magicOptions[1] === 'tablelink' && magicOptions[2]) {
    let schema: string | undefined
    let table: string | undefined
    [schema, table] = magicOptions[2].split(".")
    if (!table) {
      table = schema
      schema = undefined
    }
    return {
      friendlyColumnName: magicOptions[0],
      tableLink: { schema, table }
    }
  }
  if (magicOptions[1] === 'format') {
    switch (magicOptions[2]) {
      case 'link':
        return {
          friendlyColumnName: magicOptions[0],
          formatLink: true
        }
        break;
      default:
        break;
    }

  }

  return null
}