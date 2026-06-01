import _ from "lodash";
import { QueryAudit } from "@/common/appdb/models/QueryAudit";
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { TransportFavoriteQuery } from "@/common/transport";
import { IQueryAuditDetail } from "@/common/interfaces/IQueryAudit";

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

    return {
      ...audit,
      user: { source: "util" },
      previousAuditId: await QueryAudit.getPreviousId(queryId, audit.revision),
      values: { title: audit.title, text: audit.text },
    };
  },

  "appdb/queryAudit/restore": async function ({
    queryId,
    auditId,
  }: {
    queryId: number;
    auditId: number;
  }): Promise<TransportFavoriteQuery> {
    const audit = await QueryAudit.findOneByOrFail({
      id: auditId,
      favoriteQueryId: queryId,
    });
    const query = await FavoriteQuery.findOneByOrFail({ id: queryId });
    query.title = audit.title;
    query.text = audit.text;
    await query.save();
    return query;
  },
};
