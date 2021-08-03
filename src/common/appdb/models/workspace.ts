import { Entity, Column, Index } from "typeorm";
import { ApplicationEntity  } from './application_entity'

@Entity({ name: "workspace" })
export class Workspace  extends ApplicationEntity {
  @Column({ type: "text", nullable: false })
  name!: string;

  @Column({ type: "text", nullable: false })
  database!: string;

  @Index()
  @Column({ type: "integer", nullable: false })
  id!: number;
}
