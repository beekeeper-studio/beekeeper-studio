import _ from 'lodash'
import {VersionColumn, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn, BaseEntity} from 'typeorm'

export abstract class ApplicationEntity extends BaseEntity {
  static readonly searchableFields: string[] = []

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


  static async search(cls: any, searchText: string) {
    let builder = cls
      .createQueryBuilder("c");

    for (let i = 0; i < cls.searchableFields.length; i++) {
      const field = cls.searchableFields[i];
      const query = `LOWER(c.${field}) LIKE :q`;
      const params = { q: `%${searchText}%`};
      if (i === 0) {
        builder = builder.where(query, params);
      } else {
        builder = builder.orWhere(query, params);
      }
    }

    return await builder
      .orderBy(`c.${cls.searchableFields[0]}`, 'ASC')
      .getMany();
  }
}
