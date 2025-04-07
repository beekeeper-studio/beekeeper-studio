
import platformInfo from '@/common/platform_info'
import path from 'path'
import crypto from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { keysToStatus, LicenseKey } from '@/common/appdb/models/LicenseKey'
import { LicenseStatus } from '@/lib/license'
import rawLog from '@bksLogger'
import { snakeCaseObjectKeys } from '@/common/utils'
import { TransportLicenseKey } from '@/common/transport'

const log = rawLog.scope('OfflineLicense')

let _cachedLicense = null

/**
 * Payload looks like this (for good license):
 * {
  "license_key": {
    "valid_until": "2099-01-01T06:00:00.000Z",
    "support_until": "2099-01-01T06:00:00.000Z",
    "customer_support_until": "2099-01-01T06:00:00.000Z",
    "created_at": "2024-12-14T03:38:52.989Z",
    "license_type": "PersonalLicense",
    "email": "123",
    "id": 4,
    "key": "e605ca57-2115-4b21-b1ec-690f997df38e",
    "subscription": true,
    "max_allowed_app_release": null
  },
  "errors": null,
  "status": 200
}
 */


export interface LicenseOptions {
  licensePath?: string
  keyPath?: string
}

export class OfflineLicense {

  static load(options?: LicenseOptions): OfflineLicense {
    if (!_cachedLicense) _cachedLicense = new OfflineLicense(options)
    return _cachedLicense
  }

  defaultPath = path.join(platformInfo.userDirectory, 'license.json')
  defaultKeyPath = path.join(platformInfo.resourcesPath, 'production_pub.pem')
  path: string
  publicKeyPath: string
  rawPayload? = null
  payload = null
  publicKey = null
  isValid = false
  error?: string
  constructor(options: LicenseOptions = {}) {
    const { licensePath, keyPath } = options
    this.path = licensePath ?? this.defaultPath

    this.publicKeyPath = keyPath ?? this.defaultKeyPath
    try {
      if (existsSync(this.path)) {
        this.rawPayload = JSON.parse(readFileSync(this.path, 'utf-8'))
      }
      if (existsSync(this.publicKeyPath)) {
        this.publicKey = readFileSync(this.publicKeyPath, 'utf-8')
      }
      this.validateSignature()
      log.info("Validated license - ", this.payload)
    } catch (ex) {
      log.error("Unable to validate license -", ex)
      this.isValid = false
      this.error = ex.message
    }
  }

  exists() {
    return !!this.payload
  }

  toLicenseKey() {
    if (!this.isValid) return null
    const parsedKey = this.payload.license_key
    const result = new LicenseKey()
    result.email = parsedKey.email
    result.validUntil = new Date(parsedKey.valid_until)
    result.supportUntil = new Date(parsedKey.support_until)
    result.maxAllowedAppRelease = parsedKey.max_allowed_app_release
    result.licenseType = parsedKey.license_type
    result.key = parsedKey.key
    result.fromFile = true
    return result
  }

  toLicenseStatus(): LicenseStatus {
    const licenses = [this.toLicenseKey()]
    const result = keysToStatus(licenses)
    // we keep this, becuase if licenseKey is null, we still need LicenseStatus to know it was from a file
    result.fromFile = true
    result.filePath = this.path
    return result
  }

  validateSignature() {
    if (!this.rawPayload)    return
    if (!this.publicKey)  return
    if (!this.rawPayload?.data) return
    if (!this.rawPayload?.signature) return

    // Decode the Base64-encoded signature
    const signature = Buffer.from(this.rawPayload.signature, 'base64');
    const data = Buffer.from(this.rawPayload.data, 'base64').toString('utf-8');

  // Create a SHA256 hash of the decoded data
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();

    // Verify the signature with the public key, convert sig to uint8array
    const signatureUint8Array = new Uint8Array(signature);
    const isValid = verifier.verify(this.publicKey, signatureUint8Array);
    this.isValid = isValid
    if (this.isValid) {
      this.payload = JSON.parse(data)
    }

  }
}

