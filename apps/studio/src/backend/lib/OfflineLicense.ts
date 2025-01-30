
import platformInfo from '@/common/platform_info'
import path from 'path'
import crypto from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { LicenseKey } from '@/common/appdb/models/LicenseKey'
import { LicenseStatus } from '@/lib/license'

let _cachedLicense = null

export interface LicenseOptions {
  licensePath?: string
  keyPath?: string
}

export class OfflineLicense {

  static load(options?: LicenseOptions): OfflineLicense {
    if (!_cachedLicense) _cachedLicense = new OfflineLicense(options)
    return _cachedLicense
  }

  defaultPath = path.join(platformInfo.userDirectory, 'bks-license.json')
  defaultKeyPath = path.join(platformInfo.resourcesPath, 'public.pem')
  path: string
  publicKeyPath: string
  payload = null
  publicKey = null
  constructor(options?: LicenseOptions) {
    const { licensePath, keyPath } = options
    this.path = licensePath ?? this.defaultPath
    if (existsSync(this.path)) {
      this.payload = JSON.parse(readFileSync(this.path, 'utf-8'))
    }

    this.publicKeyPath = keyPath ?? this.defaultKeyPath
    if (existsSync(this.publicKeyPath)) {
      this.publicKey = readFileSync(this.publicKeyPath, 'utf-8')
    }
  }

  exists() {
    return !!this.payload
  }

  toLicenseKey() {
    if (!this.isValid()) return null
    const result = new LicenseKey()
    result.withProps(this.payload)
    result.fromFile = true
    return result
  }

  toLicenseStatus(): LicenseStatus {
    const result = new LicenseStatus([this.toLicenseKey()], "License file found, but it was invalid")
    // we keep this, becuase if licenseKey is null, we still need LicenseStatus to know it was from a file
    result.fromFile = true
    result.filePath = this.path
    return result
  }

  isValid() {
    if (!this.payload)    return false
    if (!this.publicKey)  return false
    if (!this.payload?.data) return false
    if (!this.payload?.signature) return false

    // Decode the Base64-encoded signature
    const signature = Buffer.from(this.payload.signature, 'base64');
    const data = Buffer.from(this.payload.data, 'base64').toString('utf-8');

  // Create a SHA256 hash of the decoded data
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();

    // Verify the signature with the public key, convert sig to uint8array
    const signatureUint8Array = new Uint8Array(signature);
    const isValid = verifier.verify(this.publicKey, signatureUint8Array);
    return isValid;

  }
}

