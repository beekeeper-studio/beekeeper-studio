const path = require('path')
const fs = require('fs')

// Packages that must ship as raw node_modules: esbuild externals (native
// modules and packages that can't be bundled) plus packages whose platform
// binaries are resolved at runtime. Everything else in `dependencies` is
// already bundled into dist/ by esbuild/vite, so shipping it again is pure
// bloat. The bundled plugins ship via extraResources (bundled_plugins)
// instead and are loaded from there, never from node_modules.
const { externals, runtimeResolved } = require('./externals.cjs')
// electron itself is provided by the runtime, never from packed node_modules;
// walking its (dev-only) dependency tree would needlessly keep packages that
// happen to share names with bundled production deps.
const keepModules = [...externals.filter((name) => name !== 'electron'), ...runtimeResolved]

// Node-style resolution: look for name in fromDir/node_modules, then walk up.
// Nested copies matter — a package may depend on an older major of a hoisted
// name (e.g. socksv5 -> ip-address@9, which needs sprintf-js while the
// hoisted ip-address@10 doesn't), and electron-builder's own hoister can
// promote that nested copy to the top level of the packed app.
function resolvePackageDir(fromDir, name) {
  let dir = fromDir
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name)
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

// Transitive closure (by package name) of the given modules' runtime deps,
// walking every reachable installed copy so version-specific deps are kept.
function dependencyClosure(moduleNames) {
  const names = new Set()
  const seenDirs = new Set()
  const queue = moduleNames
    .map((name) => ({ name, dir: resolvePackageDir(__dirname, name) }))
    .filter((entry) => entry.dir != null)
  while (queue.length > 0) {
    const { name, dir } = queue.pop()
    const realDir = fs.realpathSync(dir)
    names.add(name)
    if (seenDirs.has(realDir)) continue
    seenDirs.add(realDir)
    const pkg = JSON.parse(fs.readFileSync(path.join(realDir, 'package.json'), 'utf8'))
    const deps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.optionalDependencies || {})]
    for (const dep of deps) {
      const depDir = resolvePackageDir(realDir, dep)
      if (depDir != null) {
        queue.push({ name: dep, dir: depDir })
      }
    }
  }
  return names
}

// electron-builder always collects the full production dependency tree;
// its node_modules copier only honors *negative* `files` patterns
// (see app-builder-lib getNodeModuleFileMatcher). So the explicit
// keep-list is expressed as generated exclusions for everything outside
// the keep closure.
function excludedNodeModulePatterns() {
  const appDependencies = Object.keys(require('./package.json').dependencies)
  const keep = dependencyClosure(keepModules)
  const all = dependencyClosure(appDependencies)
  return [...all]
    .filter((name) => !keep.has(name))
    .sort()
    .map((name) => `!node_modules/${name}/**/*`)
}

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
    appimage: "1.0.3"
  },
  directories: {
    output: "dist_electron"
  },
  files: [
    'dist/**/*',
    'package.json',
    'public/icons/**/*',
    '!**/node_gyp_bins/*',
    ...excludedNodeModulePatterns()
  ],
  afterPack: "./build/afterPack.js",
  asarUnpack: [
    'package.json'
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
