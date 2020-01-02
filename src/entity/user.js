import {Entity, PrimaryGeneratedColumn, Column} from "typeorm"

import {ApplicationEntity} from './application_entity'

@Entity()
export class User extends ApplicationEntity {

    @PrimaryGeneratedColumn()
    id

    @Column("varchar")
    firstName = null

    @Column({type: "varchar", length: 255})
    lastName = null

}

