import crypto from 'crypto'
import Encryptor from 'simple-encryptor'
import fs from 'fs'
import path from 'path'
import platformInfo from './platform_info'

function initUserDirectory(d: string) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true })
  }
}
const userDirectory = platformInfo.userDirectory

const defaultEncryptionKey = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B"
const keyFile = path.join(userDirectory, '.key')

let _encryptionKey: Nullable<string> = null

export function loadEncryptionKey() {
  if (_encryptionKey) {
    return _encryptionKey
  }
  const encryptor = Encryptor(defaultEncryptionKey)

  initUserDirectory(userDirectory)

  if (!fs.existsSync(keyFile)) {
    const generatedKey = crypto.randomBytes(32)
    const newKey = generatedKey.toString('hex')
    const result = {
      'encryptionKey': newKey
    }
    fs.writeFileSync(keyFile, encryptor.encrypt(result), 'UTF8')
  }

  const encryptedData = fs.readFileSync(keyFile, 'UTF8')
  const data = encryptor.decrypt(encryptedData)
  _encryptionKey = data['encryptionKey'] as string
  return _encryptionKey
}
