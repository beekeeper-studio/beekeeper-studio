import platformInfo from "@/common/platform_info";
import { LicenseStatus, isVersionLessThanOrEqual, parseTagVersion } from "@/lib/license";
import { Column, Entity, Not } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash';

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

  /** Get all licenses except trial */
  static async all() {
    return await LicenseKey.findBy({ licenseType: Not("TrialLicense" as const) });
  }

  /** Delete all licenses except trial */
  static async wipe() {
    await LicenseKey.delete({ licenseType: Not("TrialLicense" as const) });
  }

  static async getLicenseStatus(): Promise<LicenseStatus> {
    const licenses = await LicenseKey.find();
    const currentDate = new Date();
    const currentVersion = platformInfo.parsedAppVersion;
    const status = new LicenseStatus();

    // Do they have a license at all?
    if (licenses.length === 0) {
      status.edition = "community";
      status.condition = "No license found";
      return status;
    }

    const currentLicense = _.orderBy(licenses, ["validUntil"], ["desc"])[0];
    status.license = currentLicense;

    // Is the license not valid?
    if (currentDate > currentLicense.validUntil) {
      status.edition = "community";
      status.condition = "License expired";
      return status;
    }

    // From here, we know that the license is still valid.
    // Is maxAllowedAppRelease nullish?
    if (_.isNil(currentLicense.maxAllowedAppRelease)) {
      status.edition = "ultimate";
      status.condition = "No app version restriction";
      return status;
    }

    // Does the license allow the current app version?
    if (
      isVersionLessThanOrEqual(
        currentVersion,
        parseTagVersion(currentLicense.maxAllowedAppRelease.tagName)
      )
    ) {
      status.edition = "ultimate";
      status.condition = "App version allowed";
      return status;
    }

    status.edition = "community";
    status.condition = "App version not allowed";
    return status;
  }

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

