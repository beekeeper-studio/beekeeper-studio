import { existsSync } from 'fs'
import { dirname, join } from 'path'

// Only the MSI package puts this file next to the executable
// (build/win/msiProjectCreated.js). Keep the name in sync with MARKER_FILE there.
export const MSI_MARKER_FILE = 'msi-install.txt'

// MSI installs are deployed and upgraded by IT, so the app only tells users that
// an update is available and never installs one itself.
export function isMsiInstall(execPath: string): boolean {
  return existsSync(join(dirname(execPath), MSI_MARKER_FILE))
}
