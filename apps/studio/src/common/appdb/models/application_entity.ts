import _ from 'lodash'
import {VersionColumn, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn, BaseEntity} from 'typeorm'

export abstract class ApplicationEntity extends BaseEntity {

  constructor(props?: any) {
    super()
    if (props) _.assign(this, props)
  }

  @PrimaryGeneratedColumn()
  id: Nullable<number> = null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @VersionColumn()
  version!: number


}
