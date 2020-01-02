// something
import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"

@Entity()
export class User extends BaseEntity {

    @PrimaryGeneratedColumn()
    id

    @Column("varchar")
    firstName = null

    @Column({type: "varchar", length: 255})
    lastName = null

}

