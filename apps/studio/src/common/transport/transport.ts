import { IConnection } from "../interfaces/IConnection";



// anything that is transferred to the utility process should implement this interface
// may need to add more in the future, this is just to make type stuff 
export interface Transport {
  id: number | null
}

export interface TransportPinnedConn extends Transport {
  id: number | null;
  position: number;
  connectionId: number;
  workspaceId: number;
  connection: IConnection;
}
