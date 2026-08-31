import {
  TransportQueryAudit,
  TransportQueryAuditDetail,
} from "@/common/transport/TransportQueryAudit";

export type IQueryAudit = TransportQueryAudit & {
  /** NOTE: `user` can contain nothing! */
  user: {
    id: number;
    name: string;
    email: string;
  } | {};
};

export type IQueryAuditDetail = TransportQueryAuditDetail;
