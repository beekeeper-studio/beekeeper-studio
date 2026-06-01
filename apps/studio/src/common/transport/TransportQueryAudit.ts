import { Transport } from ".";

export interface TransportQueryAudit extends Transport {
  revision: number;
  action: "create" | "update" | "destroy";
  createdAt: Date;
  user:
  | {
    source: "cloud";
    id: number;
    name: string;
    email: string;
    username: string;
  }
  | { source: "util" };
}

export interface TransportQueryAuditDetail extends TransportQueryAudit {
  previousAuditId: number | null;
  values: {
    title: string;
    text: string;
  };
}
