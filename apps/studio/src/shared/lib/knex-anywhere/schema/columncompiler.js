import _ from 'lodash';
import Raw from 'knex/lib/raw';
import ColumnCompiler from 'knex/lib/schema/columncompiler';
import { toNumber } from 'knex/lib/util/helpers';

// Column Compiler
// -------

class ColumnCompiler_Sqlanywhere extends ColumnCompiler {
  constructor(client, tableCompiler, columnBuilder) {
    super(client, tableCompiler, columnBuilder);
    this.modifiers = ['defaultTo', 'checkIn', 'nullable', 'comment'];
  }

  increments() {
    return 'integer not null primary key default autoincrement';
  }

  bigincrements() {
    return 'bigint not null primary key default autoincrement';
  }

  floating(precision) {
    toNumber
    const parsedPrecision = toNumber(precision, 0);
    return 'float' + (parsedPrecision ? '(' + parsedPrecision + ')' : '');
  }

  double(precision, scale) {
    if (!precision) return 'double';
    return 'numeric(' + toNumber(precision, 8) + ', ' + toNumber(scale, 2) + ')';
  }

  integer(length) {
    return length ? 'numeric(' + toNumber(length, 11) + ', 0)' : 'integer';
  }

  enu(allowed) {
    allowed = _.uniq(allowed);
    const maxLength = (allowed || []).reduce(function (maxLength, name) {
      return Math.max(maxLength, String(name).length);
    }, 1);

    // implicitly add the enum values as checked values
    this.columnBuilder._modifiers.checkIn = [allowed];

    return "varchar(" + maxLength + ")";
  }


  datetime(without) {
    return without ? 'timestamp' : 'timestamp with time zone';
  }

  timestamp(without) {
    return without ? 'timestamp' : 'timestamp with time zone';
  }


  bool () {
    return 'bit';
  }

  varchar(length) {
    return 'varchar(' + toNumber(length, 255) + ')';
  }

  // Modifiers
  // ------

  comment(comment) {
    this.pushAdditional(function() {
      this.pushQuery('comment on column ' + this.tableCompiler.tableName() + '.' +
        this.formatter.wrap(this.args[0]) + " is '" + (comment || '')+ "'");
    }, comment);
  }

  checkIn (value) {
    // TODO: Maybe accept arguments also as array
    // TODO: value(s) should be escaped properly
    if (value === undefined) {
      return '';
    } else if (value instanceof Raw) {
      value = value.toQuery();
    } else if (Array.isArray(value)) {
      value = _.map(value, function (v) {
        return "'" + v + "'";
      }).join(', ');
    } else {
      value = "'" + value + "'";
    }
    return 'check (' + this.formatter.wrap(this.args[0]) + ' in (' + value + '))';
  }
}

Object.assign(ColumnCompiler_Sqlanywhere.prototype, {
  tinyint: 'tinyint',

  smallint: 'smallint',

  mediumint: 'integer',

  biginteger: 'bigint',

  text: 'long varchar',

  binary: 'long binary',

  time: 'timestamp with time zone',

  bit: 'bit',

  json: 'long varchar',
});

export default ColumnCompiler_Sqlanywhere;
