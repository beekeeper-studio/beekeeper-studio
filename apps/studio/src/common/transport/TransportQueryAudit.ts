import { Transport } from ".";

export interface TransportQueryAudit extends Transport {
  revision: number;
  action: "create" | "update" | "destroy";
  createdAt: Date;
}

export interface TransportQueryAuditDetail extends TransportQueryAudit {
  previousAuditId: number | null;
  values: {
    title: string;
    text: string;
  };
}
