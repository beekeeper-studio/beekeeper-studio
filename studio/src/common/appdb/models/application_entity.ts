import {VersionColumn, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn, BaseEntity} from 'typeorm'

export class ApplicationEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: Nullable<number> = null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @VersionColumn()
  version!: number
}
