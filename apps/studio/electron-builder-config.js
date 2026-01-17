
const fpmOptions = [
  "--after-install=build/deb-postinstall"
]

const rpmFpmOptions = [
  "--after-install=build/rpm-postinstall"
]

// FIXME: Get a new certificate with a subject line that is a valid AppX publisher
// support request open to digicert currently (Feb 2025)
const certSubject = 'SERIALNUMBER=803010247, C=US, ST=Texas, L=Dallas, O="Rathbone Labs, LLC", CN="Rathbone Labs, LLC"'



module.exports = {
  appId: "io.beekeeperstudio.desktop",
  productName: "Beekeeper Studio",
  releaseInfo: {
    releaseNotesFile: "build/release-notes.md"
  },
  generateUpdatesFilesForAllChannels: true,
  directories: {
    output: "dist_electron"
  },
  files: [
    'dist/**/*',
    'package.json',
    'public/icons/**/*',
    '!**/node_gyp_bins/*'
  ],
  afterPack: "./build/afterPack.js",
  asarUnpack: [
    'package.json'
  ],
  extraResources: [
    {
      from: './extra_resources/demo.db',
      to: 'demo.db'
    },
    {
      from: './extra_resources/production_pub.pem',
      to: 'production_pub.pem'
    },
    {
      from: 'build/launcher-script.sh',
      to: 'launcher-script.sh'
    },
    {
      from: './vendor',
      to: 'vendor'
    },
    {
      from: './public',
      to: 'public'
    },
    {
      from: ".",
      to: ".",
      filter: ["user.config.ini", "system.config.ini", "default.config.ini"],
    },
    {
      from: "node_modules/ws",
      to: "node_modules/ws"
    }
  ],
  fileAssociations: [
    {
      ext: 'db',
      name: 'SQLite db file',
      mimeType: 'application/vnd.sqlite3',
    },
    {
      ext: 'sqlite3',
      name: 'SQLite sqlite3 file',
      mimeType: 'application/vnd.sqlite3'
    },
    {
      ext: 'sqlite',
      name: 'SQLite sqlite file',
      mimeType: 'application/vnd.sqlite3'
    },
    {
      ext: 'duckdb',
      name: 'DuckDB file',
      mimeType: 'application/vnd.duckdb'
    },
    {
      ext: 'ddb',
      name: 'DuckDB file',
      mimeType: 'application/vnd.duckdb'
    }
  ],
  protocols: [
    {
      name: "Amazon Redshift URL scheme",
      schemes: ["redshift"],
      role: "Editor"
    },
    {
      name: "CockroachDB URL scheme",
      schemes: ["cockroachdb", "cockroach"],
      role: "Editor"
    },
    {
      name: "MariaDB URL scheme",
      schemes: ["mariadb"],
      role: "Editor"
    },
    {
      name: "TiDB URL scheme",
      schemes: ["tidb"],
      role: "Editor"
    },
    {
      name: "MySQL URL scheme",
      schemes: ["mysql"],
      role: "Editor"
    },
    {
      name: "PostgreSQL URL scheme",
      schemes: ["postgresql", "postgres", "psql"],
      role: "Editor"
    },
    {
      name: "SQLite URL scheme",
      schemes: ["sqlite"],
      role: "Editor"
    },
    {
      name: "SQL Server URL scheme",
      schemes: ["sqlserver", "microsoftsqlserver", "mssql"],
      role: "Editor"
    }
  ],
  mac: {
    entitlements: "./build/entitlements.mac.plist",
    entitlementsInherit: "./build/entitlements.mac.plist",
    icon: './public/icons/mac/bk-icon.icns',
    category: "public.app-category.developer-tools",
    "hardenedRuntime": true,
    notarize: true,
    publish: ['github']
  },
  linux: {
    icon: './public/icons/png/',
    category: "Development",
    target: [
      'snap',
      'deb',
      'appImage',
      'rpm',
      'flatpak',
      'pacman'
    ],
    desktop: {
      'StartupWMClass': 'beekeeper-studio'
    },
    publish: ['github']
  },
  pacman: {
    depends: ["c-ares", "ffmpeg", "gtk3", "llhttp", "libevent", "libvpx", "libxslt", "libxss", "minizip", "nss", "re2", "snappy", "libnotify", "libappindicator-gtk3"]
  },
  deb: {
    publish: [
      'github'
    ],
    fpm: fpmOptions,
    // when we upgrade Electron we need to check these
    depends: ["libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils", "libatspi2.0-0", "libuuid1", "libsecret-1-0", "gnupg"]
  },
  flatpak: {
    runtime: "org.freedesktop.Platform",
    runtimeVersion: "23.08",
    sdk: "org.freedesktop.Sdk",
    base: "org.electronjs.Electron2.BaseApp",
    baseVersion: "23.08",
    finishArgs: [
      "--share=network",
      "--socket=x11",
      "--socket=wayland",
      "--device=dri",
      "--socket=pulseaudio",
      "--filesystem=home",
      "--talk-name=org.freedesktop.Notifications"
    ]
  },
  rpm: {
    publish: [ 'github' ],
    fpm: rpmFpmOptions,
  },
  snap: {
    base: 'core22',
    publish: [
      'github',
      'snapStore'
    ],
    environment: {
      "ELECTRON_SNAP": "true"
    },
    plugs: ["default", "ssh-keys", "removable-media", "mount-observe"]
  },
  win: {
    icon: './public/icons/png/512x512.png',
    // FIXME: Add AppX/MSIX build back in once certificate issues resolved
    target: ['nsis', 'portable'],
    publish: ['github'],
    sign: "./build/win/sign.js",
  },
  portable: {
    "artifactName": "${productName}-${version}-portable.exe",
  },
  nsis: {
    oneClick: false
  },
  appx: {
    applicationId: "beekeeperstudio",
    publisher: certSubject.replaceAll('"', "&quot;"),
    publisherDisplayName: "Beekeeper Studio"
  }
}
