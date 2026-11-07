import { LicenseStatus } from "@/lib/license";
import { Column, Entity, Not } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash';
import globals from "@/common/globals";
import platformInfo from '@/common/platform_info'
import { isVersionLessThanOrEqual } from "@/common/version";

function daysInFuture(days = 14) {
  return new Date(new Date().setDate(new Date().getDate() + days))
}

/** When a trial that ends at `validUntil` can be started again. */
export function trialRenewableFrom(validUntil: Date): Date {
  const date = new Date(validUntil)
  date.setMonth(date.getMonth() + globals.trialRenewalMonths)
  return date
}

export function keysToStatus(licenses: LicenseKey[]): LicenseStatus {
    const status = new LicenseStatus();
    status.condition = []
    const currentDate = new Date();
    const currentVersion = platformInfo.parsedAppVersion;

    // Do they have a license at all?
    if (licenses.length === 0) {
      status.edition = "community";
      status.condition.push("No license found");
      return status;
    }

    const currentLicense = _.orderBy(licenses, ["validUntil"], ["desc"])[0];
    status.license = currentLicense;

    // "Expired support date" indicates a paid lifetime license whose
    // support window has ended but is still valid for the version it was
    // sold against. Trial licenses are time-limited previews, not lifetime
    // licenses, so this condition does not apply to them.
    if (
      currentLicense.licenseType !== "TrialLicense" &&
      currentDate > currentLicense.supportUntil
    ) {
      status.condition.push("Expired support date");
    }

    // Is the license not valid?
    if (currentDate > currentLicense.validUntil) {
      status.edition = "community";
      status.condition.push("Expired valid date");
      return status;
    }

    // From here, we know that the license is still valid.
    // Is maxAllowedAppRelease nullish?
    if (_.isNil(currentLicense.maxAllowedAppRelease)) {
      status.edition = "ultimate";
      status.condition.push("No app version restriction");
      return status;
    }

    // Does the license allow the current app version?
    if (isVersionLessThanOrEqual(currentVersion, status.maxAllowedVersion)) {
      status.edition = "ultimate";
      status.condition.push("App version allowed");
      return status;
    }

    status.edition = "community";
    status.condition.push("App version not allowed");
    return status;
}


@Entity({ name: 'license_keys' })
export class LicenseKey extends ApplicationEntity {

  withProps(props: any) {
    console.log("merging props into me:", props)
    if (props) LicenseKey.merge(this, props);
    return this;
  }

  fromFile = false

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

  @Column({ type: 'datetime', nullable: true })
  invalidatedAt: Date | null

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
    return keysToStatus(licenses)
  }

  public get active() : boolean {
    return this.validUntil && this.validUntil > new Date()
  }

  /**
   * Whether a free trial can be started: with no license at all, or again
   * when the last trial ended more than globals.trialRenewalMonths ago and no
   * license was ever registered.
   */
  static async canStartTrial(now = new Date()): Promise<boolean> {
    const licenses = await LicenseKey.find()
    if (licenses.length === 0) return true
    if (licenses.some((l) => l.licenseType !== "TrialLicense")) return false
    const lastTrial = _.maxBy(licenses, (l) => new Date(l.validUntil).getTime())
    if (now < trialRenewableFrom(lastTrial.validUntil)) return false
    return !(await LicenseKey.wasLicenseEverRegistered(licenses.length))
  }

  /**
   * A registered license can have been removed since, but its id stays used:
   * the id is AUTOINCREMENT, so sqlite_sequence holds how many rows were ever
   * inserted. Trial rows are never deleted (renewing adds a new one), so any
   * more rows than there are trials were licenses.
   */
  private static async wasLicenseEverRegistered(trialCount: number): Promise<boolean> {
    const [row] = await LicenseKey.query(
      "SELECT seq FROM sqlite_sequence WHERE name = 'license_keys'"
    )
    return Number(row?.seq ?? 0) > trialCount
  }

  public static async createTrialLicense(validUntil = daysInFuture(globals.freeTrialDays), supportUntil = validUntil) {
    if (!(await LicenseKey.canStartTrial())) {
      throw new Error("Not allowed");
    }

    // (email, key) is unique, and a renewed trial keeps the trials before it
    const trialCount = await LicenseKey.countBy({ licenseType: "TrialLicense" })
    const trialLicense = new LicenseKey();
    trialLicense.email = "trial_user";
    trialLicense.key = trialCount === 0 ? "fake" : `fake-${trialCount + 1}`;
    trialLicense.validUntil = validUntil;
    trialLicense.supportUntil = supportUntil;
    trialLicense.licenseType = "TrialLicense";
    await trialLicense.save();
    return trialLicense;
  }
}

