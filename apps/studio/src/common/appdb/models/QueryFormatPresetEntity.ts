import { QueryFormatPreset } from "@shared/lib/queryFormatter";
import _ from "lodash";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";

@Entity({ name: "query_format_presets" })
export class QueryFormatPresetEntity extends ApplicationEntity {
  constructor(name?: string, values?: QueryFormatPreset) {
    super();

    this.name = name;
    this.values = values;
  }

  @Column({ type: "varchar", nullable: false, unique: true })
  name: string;

  @Column({ type: "simple-json", nullable: false })
  values: QueryFormatPreset;
}
