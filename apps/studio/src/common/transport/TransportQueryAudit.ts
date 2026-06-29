import { Transport } from ".";

export interface TransportQueryAudit extends Transport {
  revision: number;
  action: "create" | "update" | "destroy";
  createdAt: Date;
  /** `null` if title has not changed. */
  title: string | null;
}

export interface TransportQueryAuditDetail extends TransportQueryAudit {
  previousAuditId: number | null;
  values: {
    title: string;
    text: string;
  };
}
