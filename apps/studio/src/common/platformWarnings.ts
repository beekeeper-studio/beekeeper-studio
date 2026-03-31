export interface PlatformWarning {
  /** Key on $config to check (e.g. 'isSnap', 'isFlatpak') */
  configKey: string
  /** Optional $config key that must be falsy for the warning to show */
  unless?: string
  message: string
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
      message: 'Snap packages have limited file access. To use a database on an external drive you\'ll need to grant extra permissions.',
      link: 'https://docs.beekeeperstudio.io/support/troubleshooting/#i-get-permission-denied-when-trying-to-access-a-database-on-an-external-drive',
      linkText: 'Learn more',
    },
    {
      configKey: 'isFlatpak',
      message: 'Flatpak apps can only access files in your home directory by default.',
      link: 'https://docs.beekeeperstudio.io/installation/linux/#flatpak',
      linkText: 'Learn more',
    },
  ],
  'ssh-agent': [
    {
      configKey: 'isSnap',
      message: 'SSH Agent Forwarding is not available in the Snap version of Beekeeper Studio due to the Snap security model.',
      link: 'https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap',
      linkText: 'Learn more',
    },
  ],
  'ssh-keyfile': [
    {
      configKey: 'isSnap',
      unless: 'snapSshPlug',
      message: 'Snap packages don\'t have access to your .ssh directory by default. You\'ll need to enable SSH access and restart Beekeeper.',
      link: 'https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap',
      linkText: 'Learn more',
    },
  ],
}
