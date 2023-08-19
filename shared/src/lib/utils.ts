const UNSIGNED_COLUMN_TYPES = [
  "TINYINT",
  "SMALLINT",
  "MEDIUMINT",
  "INT",
  "INTEGER",
  "BIGINT",
  "DEC",
  "DECIMAL",
  "FLOAT",
];

export function canBeUnsignedColumn(type: string): boolean {
  return UNSIGNED_COLUMN_TYPES.some((col) => type.toUpperCase().includes(col));
}

