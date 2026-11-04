import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import type { ExtensionOrigin } from "@/services/plugin/types";

@Entity({ name: "theme_entry_cache" })
export class ThemeEntryCache extends BaseEntity {
  withProps(props: { id: string; origin: ExtensionOrigin }) {
    this.id = props.id;
    this.origin = props.origin;
    return this;
  }

  @PrimaryColumn({ type: "text", nullable: false })
  id: string;

  @Column({ type: "varchar", nullable: false })
  origin: ExtensionOrigin;
}
