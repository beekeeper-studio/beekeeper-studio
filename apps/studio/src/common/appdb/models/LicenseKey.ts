import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";

@Entity({ name: 'license_keys' })
export class LicenseKey extends ApplicationEntity {
  withProps(props: any) {
    if (props) LicenseKey.merge(this, props);
    return this;
  }

  @Column({type: 'varchar', nullable: false})
  email: string

  @Column({type: 'varchar', nullable: false})
  key: string

  @Column({type: 'datetime', nullable: false})
  validUntil: Date

  @Column({type: 'datetime', nullable: false})
  supportUntil: Date

  @Column({ type: 'varchar', nullable: false })
  licenseType: 'TrialLicense' | 'PersonalLicense' | 'BusinessLicense'

  public get active() : boolean {
    return this.validUntil && this.validUntil > new Date()
  }
}

