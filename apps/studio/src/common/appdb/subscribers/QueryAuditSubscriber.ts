import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import { FavoriteQuery } from "../models/favorite_query";
import { QueryAudit } from "../models/QueryAudit";
import _ from "lodash";

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

    const queryBuilder = transaction
      .getRepository(FavoriteQuery)
      .createQueryBuilder("q")
      .where("q.id = :id", { id: query.id })
      .orderBy("a.revision", "DESC");

    const title = await queryBuilder
      .select("q.title IS NOT a.title", "changed")
      .leftJoin("q.queryAudits", "a", "a.title IS NOT NULL")
      .getRawOne<{ changed: boolean }>();

    const text = await queryBuilder
      .select("q.text is not a.text", "changed")
      .leftJoin("q.queryAudits", "a", "a.text IS NOT NULL")
      .getRawOne<{ changed: boolean }>();

    if (!title.changed && !text.changed) {
      return;
    }

    const revision = await transaction
      .getRepository(QueryAudit)
      .createQueryBuilder("audit")
      .select("coalesce(max(audit.revision), 0)", "value")
      .where("favoriteQueryId = :id", { id: query.id })
      .getRawOne<{ value: number }>()
      .then((r) => r.value);

    const audit = await transaction.getRepository(QueryAudit).insert({
      favoriteQueryId: query.id,
      action: revision > 0 ? "update" : "create",
      revision: revision + 1,
      title: title.changed ? query.title : null,
    });

    if (text.changed) {
      await transaction.query(
        `
        UPDATE query_audit
        SET text = query.text
        FROM (SELECT text FROM favorite_query WHERE id = ?) AS query
        WHERE query_audit.id = ?
      `,
        [query.id, audit.identifiers[0].id]
      );
    }
  }
}
