import Formatter from 'knex/lib/formatter'

class Sqlanywhere_Formatter extends Formatter {
  alias(first, second) {
    return first + ' ' + second;
  }

  parameter(value, notSetValue) {
    // Returning helper uses always ROWID as string
    if (typeof value === 'boolean') {
      value = value ? 1 : 0
    }
    return prototype.parameter.call(this, value, notSetValue)
  }
  
}

export default Sqlanywhere_Formatter
