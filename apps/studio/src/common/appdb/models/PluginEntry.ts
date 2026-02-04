import { Column, Entity } from "typeorm"
import { ApplicationEntity } from "./application_entity"
import { PluginRegistryEntry, PluginOrigin } from "@/services/plugin/types"

@Entity({ name: "plugin_entry" })
export class PluginEntry extends ApplicationEntity {
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

  @Column({ type: "varchar", nullable: false })
  origin: PluginOrigin

  /** Convert this entry to PluginRegistryEntry format */
  toRegistryEntry(): PluginRegistryEntry {
    return {
      id: this.pluginId,
      name: this.name,
      author: this.author,
      repo: this.repo,
      description: this.description,
      metadata: {
        origin: this.origin,
      },
    };
  }

  /** Get all entries from this table as PluginRegistryEntry[] */
  static async getAllAsRegistryEntries(): Promise<PluginRegistryEntry[]> {
    const entries = await this.find();
    return entries.map((entry) => entry.toRegistryEntry());
  }

  /** Replace table contents with entries from PluginRegistryEntry format */
  static async upsertFromRegistry(entries: PluginRegistryEntry[]): Promise<void> {
    // Clear the entire table
    await this.clear();

    // Insert all new entries
    const newEntries = entries.map(entry => {
      const dbEntry = new this();
      dbEntry.pluginId = entry.id;
      dbEntry.name = entry.name;
      dbEntry.author = entry.author;
      dbEntry.repo = entry.repo;
      dbEntry.description = entry.description;
      dbEntry.origin = entry.metadata.origin;
      return dbEntry;
    });

    if (newEntries.length > 0) {
      await this.save(newEntries);
    }
  }
}
