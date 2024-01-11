import { Column, Entity } from "typeorm";

import { ApplicationEntity } from "./application_entity";

@Entity({ name: "connection_folder" })
export class ConnectionFolder extends ApplicationEntity {
  @Column({ type: "varchar", nullable: false })
  name: string;

  @Column({ type: "varchar", nullable: true })
  description: Nullable<string>;

  @Column({ type: "boolean", default: true })
  expanded: boolean;
}
