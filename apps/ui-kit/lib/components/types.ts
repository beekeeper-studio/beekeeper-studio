export interface TableColumn {
  /** The key of the column in the data array. */
  field: string;
  /** The data type of the column. */
  dataType?: string;
}

export type BaseData = Array<Record<string, any>>;

export type Entity = TableEntity | RoutineEntity | SchemaEntity;

interface BaseEntity {
  name: string;
  entityType: 'table' | 'view' | 'materialized-view' | '' | 'routine' | 'schema';
}

export interface TableEntity extends BaseEntity {
  entityType: 'table' | 'view' | 'materialized-view' | '';
  schema?: string;
  columns?: TableColumn[];
}

export interface RoutineEntity extends BaseEntity {
  entityType: 'routine';
  schema?: string;
  returnType: string;
  returnTypeLength?: number;
  routineParams?: RoutineParam[];
}

interface RoutineParam {
  name: string;
  type: string;
  length?: number;
}

export interface SchemaEntity extends BaseEntity {
  entityType: 'schema';
}

