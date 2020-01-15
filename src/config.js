
import os from 'os'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import Encryptor from 'simple-encryptor'

const userDirectory = path.join(os.homedir(), ".beekeeper-studio")
const defaultEncryptionKey = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B"
const keyFile = path.join(userDirectory, '.key')

function loadEncryptionKey() {
  const encryptor = Encryptor(defaultEncryptionKey)

  if(!fs.existsSync(keyFile)) {
    const generatedKey = crypto.randomBytes(32)
    const newKey = generatedKey.toString('hex')
    const result = {
      'encryptionKey': newKey
    }
    fs.writeFileSync(keyFile, encryptor.encrypt(result), 'UTF8')
    return newKey
  } else {
    const encryptedData = fs.readFileSync(keyFile, 'UTF8')
    const data = encryptor.decrypt(encryptedData)
    return data['encryptionKey']
  }
}

export default {
  userDirectory,
  encryptionKey: loadEncryptionKey(),
  environment: process.env.NODE_ENV,
  isMac: false,
  defaults: {
    connectionTypes: [
      { name: 'MySql', value: 'mysql' },
      { name: 'Postgres', value: 'psql' }
    ],
    ports: {
      'mysql': 3306,
      'psql': 5432
    },
    connectionConfig: {
      connectionType: null,
      host: 'localhost',
      port: null,
      user: null,
      password: null,
      defaultDatabase: null
    }
  }
}
