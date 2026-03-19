import { Transport } from "."
import { SshMode } from "@/common/interfaces/IConnection"

export interface TransportSshJumpHost extends Transport {
  connectionId: Nullable<number>
  position: number
  host: string
  port: number
  mode: SshMode
  username: Nullable<string>
  password: Nullable<string>
  keyfile: Nullable<string>
  keyfilePassword: Nullable<string>
}
