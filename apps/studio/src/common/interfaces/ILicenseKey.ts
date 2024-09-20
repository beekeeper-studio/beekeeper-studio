
export interface ILicenseKey {
  email: string
  key: string
  validUntil: string
  supportUntil: string
  licenseType: 'PersonalLicense' | 'BusinessLicense'
  createdAt: string
  maxAllowedAppRelease: { tagName: string } | null
}
