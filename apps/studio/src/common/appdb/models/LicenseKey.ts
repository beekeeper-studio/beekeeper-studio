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

  @Column({ type: 'json', nullable: true })
  maxAllowedAppRelease: { tagName: string }

  public get active() : boolean {
    return this.validUntil && this.validUntil > new Date()
  }

  public static async createTrialLicense() {
    if ((await LicenseKey.count()) !== 0) {
      throw new Error("Not allowed");
    }

    const validUntil = new Date(new Date().setDate(new Date().getDate() + 14));
    const trialLicense = new LicenseKey();
    trialLicense.email = "trial_user";
    trialLicense.key = "fake";
    trialLicense.validUntil = validUntil;
    trialLicense.supportUntil = validUntil;
    trialLicense.licenseType = "TrialLicense";
    await trialLicense.save();
    return trialLicense;
  }
}

