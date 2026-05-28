import _ from "lodash";
import { QueryAudit } from "@/common/appdb/models/QueryAudit";
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { TransportFavoriteQuery } from "@/common/transport";
import {
  IQueryAudit,
  IQueryAuditChangeSize,
  IQueryAuditDetail,
} from "@/common/interfaces/IQueryAudit";

interface Snapshot {
  title: string;
  text: string;
}

function auditToTransport(audit: QueryAudit): IQueryAudit {
  return {
    id: audit.id,
    revision: audit.revision,
    action: audit.action,
    createdAt: audit.createdAt,
    user: {},
  };
}

// Transform for handlersFor('queryAudit', ...): the generic `find` handler
// drives the audit list, returning lightweight IQueryAudit metadata (no text).
export async function transformAudit(audit: QueryAudit, _cls: any): Promise<IQueryAudit> {
  if (_.isNil(audit)) {
    return null;
  }
  return auditToTransport(audit);
}

// Common-prefix/suffix char delta. Mirrors the cloud API's char_diff_size:
// exact for a single contiguous edit, slight over-count for disjoint edits.
function charDiffSize(oldStr: string, newStr: string): IQueryAuditChangeSize {
  if (oldStr === newStr) {
    return { added: 0, removed: 0 };
  }
  const minLen = Math.min(oldStr.length, newStr.length);
  let prefix = 0;
  while (prefix < minLen && oldStr[prefix] === newStr[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    oldStr[oldStr.length - 1 - suffix] === newStr[newStr.length - 1 - suffix]
  ) {
    suffix++;
  }
  return {
    added: newStr.length - prefix - suffix,
    removed: oldStr.length - prefix - suffix,
  };
}

// The query audit list is served by the generic handlersFor('queryAudit', …)
// `find` handler, and recording is a FavoriteQuery lifecycle side effect. Only
// the non-CRUD operations live here: `get` computes a detail/diff shape and
// `restore` mutates the underlying FavoriteQuery (whose hooks record the audit).
export const QueryAuditHandlers = {
  "appdb/queryAudit/get": async function ({
    queryId,
    auditId,
  }: {
    queryId: number;
    auditId: number;
  }): Promise<IQueryAuditDetail | null> {
    const audit = await QueryAudit.findOneBy({
      id: auditId,
      favoriteQueryId: queryId,
    });
    if (!audit) {
      return null;
    }

    const previous = await QueryAudit.getRepository()
      .createQueryBuilder("a")
      .where("a.favoriteQueryId = :id AND a.revision < :v", {
        id: queryId,
        v: audit.revision,
      })
      .orderBy("a.revision", "DESC")
      .getOne();

    const prevSnap: Snapshot = previous
      ? { title: previous.title, text: previous.text }
      : { title: "", text: "" };
    const curSnap: Snapshot = { title: audit.title, text: audit.text };

    const changedFields: string[] = [];
    const changes: Record<string, IQueryAuditChangeSize> = {};
    for (const field of ["title", "text"] as const) {
      if (prevSnap[field] !== curSnap[field]) {
        changedFields.push(field);
        changes[field] = charDiffSize(prevSnap[field], curSnap[field]);
      }
    }

    return {
      ...auditToTransport(audit),
      previousAuditId: previous?.id ?? null,
      values: { title: audit.title, text: audit.text },
      changedFields,
      changes,
    };
  },

  "appdb/queryAudit/restore": async function ({
    queryId,
    auditId,
  }: {
    queryId: number;
    auditId: number;
  }): Promise<TransportFavoriteQuery> {
    const audit = await QueryAudit.findOneBy({
      id: auditId,
      favoriteQueryId: queryId,
    });
    if (!audit) {
      throw new Error("Audit not found");
    }

    const repo = FavoriteQuery.getRepository();
    const allCols = repo.metadata.columns.map((c) => `q.${c.propertyPath}`);
    const query = await repo
      .createQueryBuilder("q")
      .select(allCols)
      .where("q.id = :id", { id: queryId })
      .getOne();
    if (!query) {
      throw new Error("Query not found");
    }

    // The AfterUpdate hook on FavoriteQuery records the new audit entry.
    query.title = audit.title;
    query.text = audit.text;
    await query.save();

    return FavoriteQuery.merge(
      {} as FavoriteQuery,
      query
    ) as unknown as TransportFavoriteQuery;
  },
};
