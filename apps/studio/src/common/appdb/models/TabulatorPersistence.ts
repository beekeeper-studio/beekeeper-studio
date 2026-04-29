import { Column, Entity, Index, Unique } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { TransportTabulatorPersistence } from "@/common/transport/TransportTabulatorPersistence";

type InitInput = Partial<TransportTabulatorPersistence>;

@Entity({ name: "tabulator_persistence" })
@Unique(["persistenceID", "type"])
export class TabulatorPersistence extends ApplicationEntity {
  withProps(input: InitInput): TabulatorPersistence {
    if (!input) return this;
    TabulatorPersistence.merge(this, input as any);
    return this;
  }

  @Index()
  @Column({ type: "varchar", nullable: false })
  persistenceID!: string;

  @Column({ type: "varchar", nullable: false })
  type!: string;

  @Column({ type: "text", nullable: false })
  data!: string;
}
