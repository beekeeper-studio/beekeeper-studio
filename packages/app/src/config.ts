import { remote } from 'electron'
import { execSync } from 'child_process'
import platformInfo from './common/platform_info'
import { loadEncryptionKey } from './common/encryption_key'

const userDirectory = platformInfo.userDirectory

if (remote?.process?.env?.DEBUG) {
  localStorage.debug = remote.process.env.DEBUG
}

function hasSshKeysPlug() {
  if (!platformInfo.isSnap) return false;

  try {
    const code = execSync('snapctl is-connected ssh-keys')
    return Number(code) == 0
  } catch (error) {
    return false
  }
}

// this is available in vue as `this.$config`
export default {
  ...platformInfo,
  userDirectory,
  encryptionKey: loadEncryptionKey(),
  snapSshPlug: hasSshKeysPlug(),

  defaults: {
    connectionTypes: [
      { name: 'MySQL', value: 'mysql' },
      { name: 'MariaDB', value: 'mariadb'},
      { name: 'Postgres', value: 'postgresql' },
      { name: 'SQLite', value: 'sqlite' },
      { name: 'SQL Server', value: 'sqlserver' },
      { name: 'Amazon Redshift', value: 'redshift' },
      { name: 'CockroachDB', value: 'cockroachdb' }
    ],
  },
  maxResults: 50000
}
