import { Entity, Column } from "typeorm";
import { ApplicationEntity } from "./application_entity";

@Entity({ name: "directory" })
export class Directory extends ApplicationEntity {
  @Column({ type: "text", nullable: false })
  title!: string;

  @Column({ type: "text", nullable: false })
  database!: string;

  @Column({ type: "integer", nullable: false })
  deepth!: number;

  @Column({ type: "integer", nullable: false })
  workspace_id!: number;

  @Column({ type: "integer", nullable: false })
  parent_id!: number;

  @Column({ type: "integer", nullable: false })
  isWorkspace!: number;
}
