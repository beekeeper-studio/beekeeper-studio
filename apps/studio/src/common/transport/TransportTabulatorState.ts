import { Transport } from "."

export interface TransportTabulatorState extends Transport {
  workspaceId: number
  connectionId: number
  schema: string
  table: string
  value: any
}
