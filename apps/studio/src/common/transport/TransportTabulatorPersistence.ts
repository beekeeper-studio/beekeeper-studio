import { Transport } from ".";

export interface TransportTabulatorPersistence extends Transport {
  persistenceID: string;
  type: string;
  data: string;
}
