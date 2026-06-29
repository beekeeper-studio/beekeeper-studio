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

@Entity({ name: "query_audit" })
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

  @Column({ type: "integer", nullable: false })
  revision: number;

  @Column({ type: "varchar", nullable: false })
  action: "create" | "update";

  /** `title` can be null if it's not changed in this revision. Always use `getDetail`.
   * @see {QueryAudit.getDetail} **/
  @Column({ type: "varchar", nullable: true })
  title: string | null;

  /** `text` can be null if it's not changed in this revision. Always use `getDetail`.
   * @see {QueryAudit.getDetail} **/
  @Column({ type: "text", nullable: true, select: false })
  text: string | null;

  static async audit(options: {
    transaction: EntityManager;
    query: FavoriteQuery;
    excludeTitle: boolean;
    excludeText: boolean;
  }): Promise<void> {
    if (options.excludeTitle && options.excludeText) {
      throw new Error("Cannot exclude both title and text");
    }

    const revision = await options.transaction
      .getRepository(QueryAudit)
      .createQueryBuilder("audit")
      .select("COALESCE(MAX(audit.revision), 0)", "value")
      .where("favoriteQueryId = :id", { id: options.query.id })
      .getRawOne<{ value: number }>()
      .then((r) => r.value);

    const audit = options.transaction.getRepository(QueryAudit).create({
      favoriteQueryId: options.query.id,
      action: revision > 0 ? "update" : "create",
      revision: revision + 1,
      title: options.excludeTitle ? null : options.query.title,
    });

    await audit.save();

    if (!options.excludeText) {
      await options.transaction.query(
        `
        UPDATE query_audit
        SET text = query.text
        FROM (SELECT text FROM favorite_query WHERE id = ?) AS query
        WHERE query_audit.id = ?
        `,
        [options.query.id, audit.id]
      );
    }
  }

  static async getDetail(
    queryId: number,
    auditId: number
  ): Promise<TransportQueryAuditDetail | null> {
    const audit = await QueryAudit.findOneBy({
      id: auditId,
      favoriteQueryId: queryId,
    });

    if (!audit) {
      return null;
    }

    const previousAuditId = await QueryAudit.getPreviousId(
      queryId,
      audit.revision
    );
    const { title, text } = await QueryAudit.resolveSnapshot(
      queryId,
      audit.revision
    );

    return {
      ...audit,
      previousAuditId,
      values: { title, text },
    };
  }

  async restore(): Promise<void> {
    const query = await FavoriteQuery.findOneByOrFail({
      id: this.favoriteQueryId,
    });
    const { title, text } = await QueryAudit.resolveSnapshot(
      this.favoriteQueryId,
      this.revision
    );
    query.title = title;
    query.text = text;
    await query.save();
  }

  private static async resolveSnapshot(
    queryId: number,
    revision: number
  ): Promise<{ title: string; text: string }> {
    const titleObj = await QueryAudit.findOne({
      select: ["title"],
      where: {
        favoriteQueryId: queryId,
        revision: LessThanOrEqual(revision),
        title: Not(IsNull()),
      },
      order: {
        revision: "DESC",
      },
    });
    const textObj = await QueryAudit.findOne({
      select: ["text"],
      where: {
        favoriteQueryId: queryId,
        revision: LessThanOrEqual(revision),
        text: Not(IsNull()),
      },
      order: {
        revision: "DESC",
      },
    });
    return {
      title: titleObj?.title ?? "",
      text: textObj?.text ?? "",
    };
  }

  private static async getPreviousId(
    queryId: number,
    revision: number
  ): Promise<number | null> {
    const audit = await QueryAudit.findOne({
      where: {
        favoriteQueryId: queryId,
        revision: LessThan(revision),
      },
      order: {
        revision: "DESC",
      },
    });
    return audit?.id ?? null;
  }
}
