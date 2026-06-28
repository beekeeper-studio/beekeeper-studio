import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import { FavoriteQuery } from "../models/favorite_query";
import { QueryAudit } from "../models/QueryAudit";
import _ from "lodash";
import rawLog from "@bksLogger";

const log = rawLog.scope("QueryAuditSubscriber");

// Records query edit-history audits as a side effect of FavoriteQuery saves.
// Deletes cascade via the FK, so afterRemove isn't needed.
@EventSubscriber()
export class QueryAuditSubscriber
  implements EntitySubscriberInterface<FavoriteQuery> {
  listenTo(): typeof FavoriteQuery {
    return FavoriteQuery;
  }

  async afterInsert(event: InsertEvent<FavoriteQuery>): Promise<void> {
    await this.record(event);
  }

  async afterUpdate(event: UpdateEvent<FavoriteQuery>): Promise<void> {
    if (event.entity) {
      await this.record(event);
    }
  }

  // Inserts a snapshot only when title/text changed since the last audit, so
  // position-only saves (reorder) add no noise. The action and revision are
  // derived from whether any history exists yet.
  private async record(
    event: InsertEvent<FavoriteQuery> | UpdateEvent<FavoriteQuery>
  ): Promise<void> {
    const query = event.entity as FavoriteQuery;
    if (query.id == null) {
      return;
    }

    const transaction = event.manager;

    // Latest audit revision plus whether title/text changed since it. The text
    // comparison runs in SQL, so the (large) text isn't pulled back here.
    const result = await transaction
      .getRepository(FavoriteQuery)
      .createQueryBuilder("favoriteQuery")
      .leftJoin(
        QueryAudit,
        "audit",
        `audit.favoriteQueryId = favoriteQuery.id AND audit.revision = (
          SELECT MAX(latest.revision) FROM query_audit latest
          WHERE latest.favoriteQueryId = favoriteQuery.id
        )`
      )
      .where("favoriteQuery.id = :id", { id: query.id })
      .select("COALESCE(audit.revision, 0)", "revision")
      .addSelect(
        `CASE WHEN audit.id IS NULL
              OR audit.title != favoriteQuery.title
              OR audit.text != favoriteQuery.text
         THEN 1 ELSE 0 END`,
        "isDifferent"
      )
      .getRawOne<{ revision: number; isDifferent: number }>();

    if (!result) {
      log.error(`Could not find query with id ${query.id} to record audit.`);
      return;
    }

    if (!result.isDifferent) {
      return;
    }

    // Only now pull the text (potentially large) for the snapshot.
    const { text } = await transaction.getRepository(FavoriteQuery).findOne({
      where: { id: query.id },
      select: ["text"],
    });

    await transaction.insert(QueryAudit, {
      favoriteQueryId: query.id,
      revision: result.revision + 1,
      action: result.revision > 0 ? "update" : "create",
      title: query.title,
      text,
    });
  }
}
