import { PoolClient, Pool } from "pg";


export interface HasPool {
  pool: Pool
}

export interface VersionInfo {
  number: number
  version: string
  hasPartitions: boolean
}

export interface HasConnection {
  connection: PoolClient
}

export type Conn = HasPool | HasConnection
