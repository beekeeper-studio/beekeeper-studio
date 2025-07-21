import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from "lodash";
import rawLog from "@bksLogger";

const log = rawLog.scope("PluginData");

@Entity({ name: "plugin_data" })
export class PluginData extends ApplicationEntity {
  withProps(props: any) {
    if (props) PluginData.merge(this, props);
    return this;
  }

  @Column({ type: "varchar", nullable: false })
  pluginId: string;

  @Column({ type: "varchar", nullable: false })
  key: string;

  @Column({ type: "varchar", nullable: false })
  value: string;

  static async get(pluginId: string, key: string = "default"): Promise<string | null> {
    const store = await this.findOne({ where: { pluginId, key } });
    if (!store) return null;
    try {
      return JSON.parse(store.value || '"null"');
    } catch (e) {
      log.error(`Failed parsing plugin data. pluginId: ${pluginId} key: ${key}.`, e);
      return null;
    }
  }

  static async set(pluginId: string, key: string = "default", value: unknown = null) {
    const existing = await this.findOne({ where: { pluginId, key } });
    if (existing) {
      existing.value = JSON.stringify(value);
      await existing.save();
      return;
    }
    const data = new this();
    data.pluginId = pluginId;
    data.key = key;
    data.value = JSON.stringify(value);
    await data.save();
  }
}
