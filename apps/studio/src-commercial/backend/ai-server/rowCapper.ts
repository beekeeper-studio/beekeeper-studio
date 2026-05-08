import _ from "lodash";
import { NgQueryResult } from "@/lib/db/models";

export interface CappedResult {
  results: NgQueryResult[];
  truncated: boolean;
  totalRowCount: number;
  rowCount: number;
}

export function capResults(results: NgQueryResult[], maxRows: number): CappedResult {
  let truncated = false;
  let totalRowCount = 0;
  let rowCount = 0;
  const out = (results ?? []).map((r) => {
    const incoming = r.rowCount ?? (r.rows ? r.rows.length : 0);
    totalRowCount += incoming;
    if (incoming > maxRows) {
      truncated = true;
      const capped = { ...r };
      capped.rows = _.take(r.rows ?? [], maxRows);
      (capped as NgQueryResult & { totalRowCount?: number }).totalRowCount = incoming;
      capped.rowCount = capped.rows.length;
      (capped as NgQueryResult & { truncated?: boolean }).truncated = true;
      rowCount += capped.rowCount;
      return capped;
    }
    rowCount += incoming;
    return r;
  });
  return { results: out, truncated, totalRowCount, rowCount };
}
