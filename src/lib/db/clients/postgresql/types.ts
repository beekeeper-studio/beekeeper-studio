import { PoolClient, Pool } from "pg";


export interface HasPool {
  pool: Pool
}

export interface VersionInfo {
  isPostgres: boolean
  isCockroach: boolean
  isRedshift: boolean
  number: number
  version: string
}

export interface HasConnection {
  connection: PoolClient
}

export type Conn = HasPool | HasConnection