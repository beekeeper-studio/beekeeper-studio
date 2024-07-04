import { IConnection } from "../interfaces/IConnection";



// anything that is transferred to the utility process should implement this interface
// may need to add more in the future, this is just to make type stuff 
export interface Transport {
  id: number | null
  createdAt: Date,
  updatedAt: Date,
  version: number
}

export interface TransportPinnedConn extends Transport {
  position: number;
  connectionId: number;
  workspaceId: number;
  connection: IConnection;
}

export interface TransportFavoriteQuery extends Transport {
  title: string;
  text: string;
  database: string | null;
  connectionHash: string;
}
