import { Entity, Column, Index } from 'typeorm'
import { ApplicationEntity  } from './application_entity'

@Entity({ name: 'model_erd' })
export class ModelERD extends ApplicationEntity {

  @Column({type: "varchar", nullable: false})
  title

  @Column({type: "text", nullable: false})
  text

  @Column("varchar")
  database

  @Index()
  @Column({type: "varchar", nullable: false})
  connectionHash

}
