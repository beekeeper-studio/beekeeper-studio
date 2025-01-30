import { loadEncryptionKey } from "@/common/encryption_key";
import { Column, Entity } from "typeorm";
import { EncryptTransformer } from "../transformers/Transformers";
import { ApplicationEntity } from "./application_entity";

const encrypt = new EncryptTransformer(loadEncryptionKey());

@Entity({ name: 'token_cache' })
export class TokenCache extends ApplicationEntity {
  withProps(props?: any): TokenCache {
    if (props) TokenCache.merge(this, props);
    return this;
  }

  @Column({ type: "varchar", nullable: false, transformer: [encrypt] })
  homeId: string

  @Column({ type: "text", nullable: true, transformer: [encrypt] })
  cache: Nullable<string>;

  @Column({ type: "text", nullable: true })
  name: Nullable<string>;
}
