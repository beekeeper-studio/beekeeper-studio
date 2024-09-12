import _ from 'lodash'
import {VersionColumn, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn, BaseEntity} from 'typeorm'

export abstract class ApplicationEntity extends BaseEntity {
  constructor() {
    super()
  }

  abstract withProps(props: any): any;

  @PrimaryGeneratedColumn()
  id: Nullable<number> = null

  @CreateDateColumn()
  createdAt: Date = new Date()

  @UpdateDateColumn()
  updatedAt: Date = new Date()

  @VersionColumn()
  version!: number


}
