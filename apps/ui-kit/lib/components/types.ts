import { PropType } from "vue";

export interface TableColumn {
  /** The key of the column in the data array. */
  field: string;
  /** The data type of the column. */
  dataType?: string;
}

export type BaseData = Array<Record<string, any>>;

export type Entity = TableEntity | RoutineEntity | SchemaEntity;

export type EntityType = '' | 'table' | 'view' | 'materialized-view' | '' | 'routine' | 'schema';

interface BaseEntity {
  id?: string;
  name: string;
  entityType: EntityType;
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

type InferPropType<T> =
  T extends { type: PropType<infer V> } ? V :
  T extends { type: () => infer V } ? V :
  T extends { default: infer V } ? V :
  any;

export type PropsToType<P> = {
  [K in keyof P]: InferPropType<P[K]>
}

// make a constant array from object keys
// credits goes to https://twitter.com/WrocTypeScript/status/1306296710407352321
export type TupleUnion<U extends string, R extends any[] = []> = {
  [S in U]: Exclude<U, S> extends never ? [...R, S] : TupleUnion<Exclude<U, S>, [...R, S]>;
}[U];

