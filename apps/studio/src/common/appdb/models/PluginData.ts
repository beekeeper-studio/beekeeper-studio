import { Column, Entity, IsNull } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from "lodash";
import rawLog from "@bksLogger";

const log = rawLog.scope("PluginData");

export type PluginDataOptions = {
  connectionId?: number;
  workspaceId?: number;
};

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

  @Column({ type: "integer", nullable: true })
  connectionId: number | null;

  @Column({ type: "integer", nullable: true })
  workspaceId: number | null;

  static async get(
    pluginId: string,
    key: string = "default",
    options?: PluginDataOptions
  ): Promise<string | null> {
    const store = await this.findOne({
      where: {
        pluginId,
        key,
        connectionId: options?.connectionId ?? IsNull(),
        workspaceId: options?.workspaceId ?? IsNull(),
      },
    });
    if (!store) return null;
    try {
      return JSON.parse(store.value || '"null"');
    } catch (e) {
      log.error(`Failed parsing plugin data. pluginId: ${pluginId} key: ${key}.`, e);
      return null;
    }
  }

  static async set(
    pluginId: string,
    key: string = "default",
    value: unknown = null,
    options?: PluginDataOptions
  ) {
    const existing = await this.findOne({
      where: {
        pluginId,
        key,
        connectionId: options?.connectionId ?? IsNull(),
        workspaceId: options?.workspaceId ?? IsNull(),
      },
    });
    if (existing) {
      existing.value = JSON.stringify(value);
      await existing.save();
      return;
    }
    const data = new this();
    data.pluginId = pluginId;
    data.key = key;
    data.value = JSON.stringify(value);
    data.connectionId = options?.connectionId ?? null;
    data.workspaceId = options?.workspaceId ?? null;
    await data.save();
  }
}
