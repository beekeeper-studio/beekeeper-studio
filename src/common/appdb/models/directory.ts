import { Entity, Column, Index } from "typeorm";
import { ApplicationEntity } from "./application_entity";

@Entity({ name: "directory" })
export class Directory extends ApplicationEntity {
  @Column({ type: "text", nullable: false })
  name!: string;

  @Column({ type: "integer", nullable: false })
  deepth!: number;

  @Column({ type: "integer", nullable: false })
  woorkspace_id!: number;

  @Column({ type: "text", nullable: false })
  path!: string;

  @Index()
  @Column({ type: "integer", nullable: false })
  id!: number;
}
