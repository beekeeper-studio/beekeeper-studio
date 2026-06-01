import { Column, Entity, Index, ManyToOne } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { FavoriteQuery } from "./favorite_query";

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

  @Column({ type: "varchar", nullable: false })
  title: string;

  @Column({ type: "text", nullable: false })
  text: string;

  static async getPreviousId(queryId: number, revision: number): Promise<number | null> {
    const audit = await QueryAudit.getRepository()
      .createQueryBuilder("a")
      .where(
        "a.favoriteQueryId = :id AND a.revision < :v",
        { id: queryId, v: revision }
      )
      .orderBy("a.revision", "DESC")
      .getOne()
    return audit?.id ?? null;
  }
}
