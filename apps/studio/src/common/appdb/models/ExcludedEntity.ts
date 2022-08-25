import { Entity } from "typeorm";
import { BaseBKEntity } from "./BaseBKEntity";

@Entity({ name: 'excluded_entities'})
export class ExcludedEntity extends BaseBKEntity {}
