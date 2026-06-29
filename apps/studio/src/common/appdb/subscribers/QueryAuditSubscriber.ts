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

    const isTitleAudited = await query.checkAudited("title");
    const isTextAudited = await query.checkAudited("text");

    if (isTitleAudited && isTextAudited) {
      return;
    }

    await QueryAudit.audit({
      transaction: event.manager,
      query,
      excludeTitle: isTitleAudited,
      excludeText: isTextAudited,
    });
  }
}
