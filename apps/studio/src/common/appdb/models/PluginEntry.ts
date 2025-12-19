import { Column, Entity } from "typeorm"
import { ApplicationEntity } from "./application_entity"
import { PluginRegistryEntry } from "@/services/plugin/types"

class PluginEntry extends ApplicationEntity {
  withProps(props?: any): PluginEntry {
    if (props) PluginEntry.merge(this, props);
    return this;
  }

  @Column({ type: "varchar", nullable: false })
  pluginId: string

  @Column({ type: "varchar", nullable: false })
  name: string

  @Column({ type: "varchar", nullable: false })
  author: string

  @Column({ type: "varchar", nullable: false })
  repo: string

  @Column({ type: "text", nullable: false })
  description: string

  /** Convert this entry to PluginRegistryEntry format */
  toRegistryEntry(): PluginRegistryEntry {
    return {
      id: this.pluginId,
      name: this.name,
      author: this.author,
      repo: this.repo,
      description: this.description,
    };
  }

  /** Get all entries from this table as PluginRegistryEntry[] */
  static async getAllAsRegistryEntries(): Promise<PluginRegistryEntry[]> {
    const entries = await this.find();
    return entries.map((entry) => entry.toRegistryEntry());
  }

  /** Upsert entries from PluginRegistryEntry format */
  static async upsertFromRegistry(entries: PluginRegistryEntry[]): Promise<void> {
    for (const entry of entries) {
      let dbEntry = await this.findOneBy({ pluginId: entry.id });
      if (!dbEntry) {
        dbEntry = new this();
        dbEntry.pluginId = entry.id;
      }
      dbEntry.name = entry.name;
      dbEntry.author = entry.author;
      dbEntry.repo = entry.repo;
      dbEntry.description = entry.description;
      await dbEntry.save();
    }
  }
}

@Entity({ name: "core_plugin_entry" })
export class CorePluginEntry extends PluginEntry { }

@Entity({ name: "community_plugin_entry" })
export class CommunityPluginEntry extends PluginEntry { }

