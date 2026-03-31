export interface PlatformWarning {
  /** Key on $config to check (e.g. 'isSnap', 'isFlatpak') */
  configKey: string
  /** Optional $config key that must be falsy for the warning to show */
  unless?: string
  message: string
  /** Optional shell command to display in a code block */
  command?: string
  link?: string
  linkText?: string
}

/**
 * Platform-specific warnings keyed by location in the UI.
 * The PlatformWarning component filters these at render time
 * based on the current platform config.
 */
export const platformWarnings: Record<string, PlatformWarning[]> = {
  'database-file': [
    {
      configKey: 'isSnap',
      message: 'Hey snap user! If you want to use a database on an external drive you\'ll need to give Beekeeper some extra permissions.',
      link: 'https://docs.beekeeperstudio.io/support/troubleshooting/#i-get-permission-denied-when-trying-to-access-a-database-on-an-external-drive',
      linkText: 'Read more',
    },
    {
      configKey: 'isFlatpak',
      message: 'Hey Flatpak user! Beekeeper can only access files in your home directory by default. To access files elsewhere, run:',
      command: 'flatpak override --user io.beekeeperstudio.Studio --filesystem=/path/to/dir',
      link: 'https://docs.beekeeperstudio.io/support/troubleshooting/#i-get-permission-denied-when-trying-to-access-a-database-on-an-external-drive',
      linkText: 'Read more',
    },
  ],
  'ssh-agent': [
    {
      configKey: 'isSnap',
      message: 'SSH Agent Forwarding is not possible with the Snap version of Beekeeper Studio due to the security model of Snap apps.',
      link: 'https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap',
      linkText: 'Read more',
    },
  ],
  'ssh-keyfile': [
    {
      configKey: 'isSnap',
      unless: 'snapSshPlug',
      message: 'Hey snap user! You need to enable SSH access, then restart Beekeeper to provide access to your .ssh directory.',
      link: 'https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap',
      linkText: 'Enable SSH access',
    },
  ],
}
