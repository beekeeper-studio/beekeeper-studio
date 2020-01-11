import {VersionColumn, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn, BaseEntity} from 'typeorm'

export class ApplicationEntity extends BaseEntity {


  @PrimaryGeneratedColumn()
  id

  @CreateDateColumn()
  createdAt

  @UpdateDateColumn()
  updatedAt

  @VersionColumn()
  version

}