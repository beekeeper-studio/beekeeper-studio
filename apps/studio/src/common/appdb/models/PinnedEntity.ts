import { Column, Entity } from "typeorm";
import { BaseBKEntity } from "./BaseBKEntity";

@Entity({ name: 'pins'})
export class PinnedEntity extends BaseBKEntity {
	@Column({ type: 'boolean', default: false })
	open: boolean = false

	@Column({ type: 'float', nullable: false, default: 1 })
	position: number = 99.0
}
