import fs from 'fs'
import os from 'os'
import path from 'path'

// Writes a throwaway shared-credentials file into os.tmpdir() and points
// AWS_SHARED_CREDENTIALS_FILE at it, so the `fromIni`/profile code path in
// getIAMPassword has something to read without ever touching the developer's
// real ~/.aws/credentials. All state is restored in teardown().

interface State {
  filePath: string
  prevSharedFile: string | undefined
  prevProfileVar: string | undefined
  profile: string
}

let state: State | null = null

export function setupCredentialsFile(): void {
  if (state) {
    throw new Error('credentials file already set up — teardown() was not called')
  }

  const accessKeyId = process.env.BKS_TEST_ACCESS_KEY_ID
  const secretAccessKey = process.env.BKS_TEST_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'BKS_TEST_ACCESS_KEY_ID / BKS_TEST_SECRET_ACCESS_KEY must be set to use the File auth method'
    )
  }

  const profile = process.env.BKS_TEST_AWS_PROFILE || 'bks-ci'
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-rds-creds-'))
  const filePath = path.join(dir, 'credentials')

  const contents =
    `[${profile}]\n` +
    `aws_access_key_id = ${accessKeyId}\n` +
    `aws_secret_access_key = ${secretAccessKey}\n`

  fs.writeFileSync(filePath, contents, { mode: 0o600 })

  state = {
    filePath,
    prevSharedFile: process.env.AWS_SHARED_CREDENTIALS_FILE,
    prevProfileVar: process.env.AWS_PROFILE,
    profile,
  }

  process.env.AWS_SHARED_CREDENTIALS_FILE = filePath
  // Don't set AWS_PROFILE — we want the driver's `awsProfile` field to drive
  // selection, matching how the Beekeeper UI hands it to getIAMPassword.
}

export function teardownCredentialsFile(): void {
  if (!state) return

  if (state.prevSharedFile === undefined) {
    delete process.env.AWS_SHARED_CREDENTIALS_FILE
  } else {
    process.env.AWS_SHARED_CREDENTIALS_FILE = state.prevSharedFile
  }

  try {
    fs.rmSync(path.dirname(state.filePath), { recursive: true, force: true })
  } catch {
    // best-effort cleanup
  }

  state = null
}
