import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import type {
  ExtensionOrigin,
  ExtensionRegistryEntry,
} from "@/services/plugin/types";

@Entity({ name: "theme_entry_cache" })
export class ThemeEntryCache extends BaseEntity {
  withProps(props: ExtensionRegistryEntry) {
    // @ts-ignore It will just never be happy
    ThemeEntryCache.merge(this, props);
    return this;
  }

  @PrimaryColumn({ type: "text", nullable: false })
  id: string;

  @Column({ type: "text", nullable: false })
  name: string;

  @Column({ type: "text", nullable: false })
  author: string;

  @Column({ type: "text", nullable: false })
  description: string;

  @Column({ type: "text", nullable: false })
  repo: string;

  @Column({ type: "varchar", nullable: false })
  origin: ExtensionOrigin;
}
