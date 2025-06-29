import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { EncryptTransformer } from "../transformers/Transformers";
import { loadEncryptionKey } from "../../encryption_key";
import _ from "lodash";

const encrypt = new EncryptTransformer(loadEncryptionKey());

@Entity({ name: "plugin_data" })
export class PluginData extends ApplicationEntity {
  withProps(props: any) {
    if (props) PluginData.merge(this, props);
    return this;
  }

  @Column({ type: "varchar", nullable: false })
  pluginId: string;

  @Column({ type: "varchar", nullable: true })
  data: string;

  @Column({ type: "varchar", nullable: true, transformer: [encrypt] })
  encryptedData: string;
}
