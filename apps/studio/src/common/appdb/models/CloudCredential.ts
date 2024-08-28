import { loadEncryptionKey } from "@/common/encryption_key";
import { Column, Entity } from "typeorm";
import { EncryptTransformer } from "../transformers/Transformers";
import { ApplicationEntity } from "./application_entity";

const encrypt = new EncryptTransformer(loadEncryptionKey())


@Entity({ name: 'cloud_credential'})
export class CloudCredential extends ApplicationEntity {

  withProps(props?: any): CloudCredential {
    if (props) CloudCredential.merge(this, props);
    return this;
  }

  @Column({type: 'varchar', nullable: false})
  appId: string | null

  @Column({ type: 'varchar', nullable: false, unique: true})
  email: string | null

  @Column({ type: 'varchar', nullable: false, transformer: [encrypt]})
  token: string | null
}
