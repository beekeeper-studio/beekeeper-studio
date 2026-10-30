import {
  Column,
  Entity,
  EntityManager,
  Index,
  IsNull,
  LessThan,
  LessThanOrEqual,
  ManyToOne,
  Not,
} from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { FavoriteQuery } from "./favorite_query";
import { TransportQueryAuditDetail } from "@/common/transport/TransportQueryAudit";

@Entity({ name: "query_audit", orderBy: { createdAt: "DESC", id: "DESC" } })
export class QueryAudit extends ApplicationEntity {
  withProps(props?: any): QueryAudit {
    if (props) QueryAudit.merge(this, props);
    return this;
  }

  @Index()
  @Column({ type: "integer", nullable: false })
  favoriteQueryId: number;

  // Audits are deleted automatically when their query is removed (DB-level
  // ON DELETE CASCADE). Do not initialize to null; see FavoriteQuery.queryFolder.
  @ManyToOne(() => FavoriteQuery, { nullable: false, onDelete: "CASCADE" })
  favoriteQuery?: FavoriteQuery;

  @Index()
  @Column({ type: "integer", nullable: true })
  previousAuditId: number | null;

  @Column({ type: "varchar", nullable: false })
  action: "create" | "update";

  /** `name` can be null if it's not changed. Always use `getDetail` to resolve it.
   * @see {QueryAudit.fetchDetail} **/
  @Column({ type: "varchar", nullable: true })
  name: string | null;

  /** `text` can be null if it's not changed. Always use `getDetail` to resolve it.
   * @see {QueryAudit.fetchDetail} **/
  @Column({ type: "text", nullable: true, select: false })
  text: string | null;

  private async resolveName(): Promise<string> {
    return await QueryAudit.findOne({
      select: ["name"],
      where: {
        favoriteQueryId: this.favoriteQueryId,
        createdAt: LessThanOrEqual(this.createdAt),
        name: Not(IsNull()),
      },
    }).then((q) => q.name);
  }

  private async resolveSnapshot(): Promise<{ text: string; name: string }> {
    const name = await this.resolveName();
    const textObj = await QueryAudit.findOne({
      select: ["text"],
      where: {
        favoriteQueryId: this.favoriteQueryId,
        createdAt: LessThanOrEqual(this.createdAt),
        text: Not(IsNull()),
      },
    });
    return { name, text: textObj?.text ?? "" };
  }

  async fetchDetail(): Promise<TransportQueryAuditDetail> {
    return { ...this, values: await this.resolveSnapshot() };
  }

  /** @param updatedAt - apply query's `updatedAt` (for testing only). */
  async restore(updatedAt?: Date): Promise<void> {
    await FavoriteQuery.createQueryBuilder("query")
      .update()
      .set({
        name: await this.resolveName(),
        text: () =>
          QueryAudit.createQueryBuilder()
            .subQuery()
            .select("text")
            .from(QueryAudit, "audit")
            .where("audit.favoriteQueryId = :queryId")
            .andWhere("audit.createdAt <= :createdAt")
            .andWhere("audit.text IS NOT NULL")
            .orderBy("audit.createdAt", "DESC")
            .limit(1)
            .getQuery(),
        updatedAt,
      })
      .where("id = :queryId")
      .setParameters({
        queryId: this.favoriteQueryId,
        createdAt: this.createdAt,
      })
      .execute();
  }
}
