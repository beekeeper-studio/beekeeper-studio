import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import rawLog from '@bksLogger'

const log = rawLog.scope('InstallationId')

@Entity({ name: 'installation_ids' })
export class InstallationId extends ApplicationEntity {

  withProps(props: any) {
    this.installationId = props.installationId
    return this
  }

  @Column({ type: 'varchar', nullable: false })
  installationId!: string;

  static async get(): Promise<string | null> {
    try {
      const records = await InstallationId.find()
      const record = records[0]
      log.info("Found ID:", record)

      return record?.installationId || null;
    } catch (error) {
      console.error('Error retrieving installation ID:', error);
      return null;
    }
  }
}
