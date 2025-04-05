import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ApplicationEntity } from "./application_entity";

@Entity({ name: 'installation_id' })
export class InstallationId extends ApplicationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', nullable: false })
  installation_id!: string;

  static async get(): Promise<string | null> {
    try {
      const record = await InstallationId.findOne({
        order: { id: 'ASC' }
      });
      return record?.installation_id || null;
    } catch (error) {
      console.error('Error retrieving installation ID:', error);
      return null;
    }
  }
}