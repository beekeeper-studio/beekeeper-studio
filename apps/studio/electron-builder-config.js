const path = require('path')

const fpmOptions = [
  "--after-install=build/deb-postinstall"
]

const rpmFpmOptions = [
  "--after-install=build/rpm-postinstall",
  // Workaround for weird electron build issues conflicting with other elcetron apps on fedora
  // https://github.com/electron/forge/issues/3594
  "--rpm-rpmbuild-define=_build_id_links none"
]

// FIXME: Get a new certificate with a subject line that is a valid AppX publisher
// support request open to digicert currently (Feb 2025)
const certSubject = 'SERIALNUMBER=803010247, C=US, ST=Texas, L=Dallas, O="Rathbone Labs, LLC", CN="Rathbone Labs, LLC"'
const bksAiShellPath = path.dirname(require.resolve('@beekeeperstudio/bks-ai-shell/package.json'));
const bksErDiagramPath = path.dirname(require.resolve('@beekeeperstudio/bks-er-diagram/package.json'));



module.exports = {
  appId: "io.beekeeperstudio.desktop",
  productName: "Beekeeper Studio",
  releaseInfo: {
    releaseNotesFile: "build/release-notes.md"
  },
  generateUpdatesFilesForAllChannels: true,
  toolsets: {
    // Keep the legacy FUSE2 AppImage runtime ("0.0.0", electron-builder's
    // current default). The newer static type-2 runtime ("1.0.2"/"1.0.3")
    // drops the libfuse2 dependency but regresses on systems with stable
    // AppImageLauncher installed: the launch fails with
    // "appimage_shall_not_be_integrated() failed" followed by
    // "fuse: memory allocation failed" and a squashfuse usage dump, leaving
    // the app unable to start. The only runtime-side fix is users upgrading
    // AppImageLauncher to 3.0.0-alpha-4+, which we can't require.
    // See AppImage/type2-runtime#121. Revisit when the static runtime is
    // compatible with shipped AppImageLauncher versions.
    appimage: "0.0.0"
  },
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
    'package.json',
    // msnodesqlv8 ships a native ODBC addon used for SQL Server integrated
    // (SSPI/Kerberos) auth. prebuild-install drops the binary under build/Release
    // and/or prebuilds depending on platform, so unpack both.
    '**/msnodesqlv8/**/*.node'
  ],
  extraResources: [
    {
      from: bksAiShellPath,
      to: "bundled_plugins/@beekeeperstudio/bks-ai-shell"
    },
    {
      from: bksErDiagramPath,
      to: "bundled_plugins/@beekeeperstudio/bks-er-diagram"
    },
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
      filter: ["user.config.ini", "system.config.ini", "default.config.ini", "deprecated.config.ini"],
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
    },
    {
      "name": "Redis URL scheme",
      "schemes": ["redis", "rediss"],
      "role": "Editor"
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
    // Align the installed .desktop filename with the WM_CLASS Electron reports at
    // runtime (derived from desktopName in package.json) so desktop environments
    // associate running windows with the launcher entry. Both resolve to
    // beekeeper-studio.desktop / StartupWMClass=beekeeper-studio.
    syncDesktopName: true,
    desktop: {
      entry: {
        'StartupWMClass': 'beekeeper-studio',
      }
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
  snapcraft: {
    base: 'core24',
    publish: [
      'github',
      'snapStore'
    ],
    core24: {
      // Build the core24 snap in an isolated LXD container. CI provisions LXD
      // via canonical/setup-lxd on every Linux runner.
      useLXD: true,
      environment: {
        "ELECTRON_SNAP": "true"
      },
      // core24 drops browser-support from its default plug set. It must be
      // declared so Chromium can use /dev/shm under strict confinement.
      // Use the plain interface (not allow-sandbox: true) — the privileged
      // form is denied auto-connection by snapd, so it would stay disconnected
      // on both sideloaded and store installs. electron-builder appends
      // --no-sandbox automatically when allow-sandbox isn't set, matching the
      // previous core22 behaviour.
      plugs: [
        "default",
        "ssh-keys",
        "removable-media",
        "mount-observe",
        "browser-support"
      ],
      // Bundle fonts so non-Latin text and emoji render correctly. "default"
      // keeps electron-builder's standard stage packages.
      stagePackages: [
        "default",
        "fonts-noto",
        "fonts-noto-cjk",
        "fonts-noto-color-emoji",
        "fonts-liberation"
      ]
    }
  },
  win: {
    icon: './public/icons/png/512x512.png',
    // FIXME: Add AppX/MSIX build back in once certificate issues resolved
    target: ['nsis', 'portable'],
    publish: ['github'],
    signtoolOptions: {
      sign: "./build/win/sign.js",
    },
  },
  portable: {
    "artifactName": "${productName}-${version}-portable.exe",
  },
  nsis: {
    oneClick: false,
    include: './build/win/msvc-redist.nsh'
  },
  appx: {
    applicationId: "beekeeperstudio",
    publisher: certSubject.replaceAll('"', "&quot;"),
    publisherDisplayName: "Beekeeper Studio"
  }
}
