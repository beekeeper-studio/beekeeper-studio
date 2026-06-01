import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import { FavoriteQuery } from "../models/favorite_query";
import { QueryAudit } from "../models/QueryAudit";

// Records query edit-history audits as a side effect of FavoriteQuery saves.
// Deletes cascade via the FK, so afterRemove isn't needed.
@EventSubscriber()
export class QueryAuditSubscriber
  implements EntitySubscriberInterface<FavoriteQuery>
{
  listenTo(): typeof FavoriteQuery {
    return FavoriteQuery;
  }

  async afterInsert(event: InsertEvent<FavoriteQuery>): Promise<void> {
    await this.record(event.manager, event.entity);
  }

  async afterUpdate(event: UpdateEvent<FavoriteQuery>): Promise<void> {
    if (event.entity) {
      await this.record(event.manager, event.entity as FavoriteQuery);
    }
  }

  // Inserts a snapshot only when title/text changed since the last audit, so
  // position-only saves (reorder) add no noise. The action and revision are
  // derived from whether any history exists yet.
  private async record(
    transaction: EntityManager,
    query: FavoriteQuery
  ): Promise<void> {
    if (query.id == null) {
      return;
    }
    const title = query.title ?? "";
    const text = query.text ?? "";
    const latest = await transaction.findOne(QueryAudit, {
      where: { favoriteQueryId: query.id },
      order: { revision: "DESC" },
    });
    if (latest && latest.title === title && latest.text === text) {
      return;
    }
    await transaction.insert(QueryAudit, {
      favoriteQueryId: query.id,
      revision: latest ? latest.revision + 1 : 1,
      action: latest ? "update" : "create",
      title,
      text,
    });
  }
}
