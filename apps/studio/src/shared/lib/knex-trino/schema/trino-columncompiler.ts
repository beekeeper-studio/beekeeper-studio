import KnexColumnCompiler from 'knex/lib/schema/columncompiler';

class ColumnCompiler_Trino extends KnexColumnCompiler {
  // Trino data types
  timestamp(): string {
    return 'timestamp';
  }

  timestamptz(): string {
    return 'timestamp with time zone';
  }

  boolean(): string {
    return 'boolean';
  }

  integer(): string {
    return 'integer';
  }

  smallint(): string {
    return 'smallint';
  }

  bigint(): string {
    return 'bigint';
  }

  tinyint(): string {
    return 'tinyint';
  }

  varchar(length?: number): string {
    return `varchar(${length || 255})`;
  }

  text(): string {
    return 'varchar';
  }

  decimal(precision?: number, scale?: number): string {
    return `decimal(${precision || 8}, ${scale || 2})`;
  }

  double(): string {
    return 'double';
  }

  date(): string {
    return 'date';
  }

  time(): string {
    return 'time';
  }

  json(): string {
    return 'json';
  }

  uuid(): string {
    return 'uuid';
  }
  
  // Column modifiers
  nullable(nullable?: boolean): string {
    return nullable === false ? 'NOT NULL' : 'NULL';
  }

  comment(comment?: string): string {
    return comment ? `COMMENT '${comment}'` : '';
  }
}

export default ColumnCompiler_Trino;