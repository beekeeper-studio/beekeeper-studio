import { Transport } from ".";

export interface TransportQueryAudit extends Transport {
  action: "create" | "update";
  createdAt: Date;
  /** `null` if name has not changed. */
  name: string | null;
}

export interface TransportQueryAuditDetail extends TransportQueryAudit {
  previousAuditId: number | null;
  values: {
    name: string;
    text: string;
  };
}
