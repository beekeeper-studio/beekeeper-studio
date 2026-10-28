import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { PluginOrigin, PluginRegistryEntry } from "@/services/plugin";

@Entity({ name: "plugin_entry_cache"})
export class PluginEntryCache extends BaseEntity {
  withProps(props: PluginRegistryEntry) {
    // @ts-ignore It will just never be happy
    PluginEntryCache.merge(this, props);
    return this;
  }

  @PrimaryColumn({ type: 'text', nullable: false })
  id: string;

  @Column({ type: 'text', nullable: false})
  name: string

  @Column({ type: 'text', nullable: false})
  author: string

  @Column({ type: 'text', nullable: false})
  description: string

  @Column({ type: 'text', nullable: false})
  repo: string

  @Column({ type: 'varchar', nullable: false})
  origin: PluginOrigin
}
