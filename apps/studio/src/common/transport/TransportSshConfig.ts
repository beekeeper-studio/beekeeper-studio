import { Transport } from "."
import { SshMode } from "@/common/interfaces/IConnection"

export interface TransportSshConfig extends Transport {
  host: string
  port: number
  mode: SshMode
  username: Nullable<string>
  password: Nullable<string>
  keyfile: Nullable<string>
  keyfilePassword: Nullable<string>
}

export interface TransportConnectionSshConfig extends Transport {
  connectionId: number
  sshConfigId: number
  position: number
  sshConfig: TransportSshConfig
}
