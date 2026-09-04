const base = require('./electron-builder-config');

// Local installer for the customized app; no upstream publishing or credentials.
module.exports = {
  ...base,
  appId: 'io.beekeeperstudio.desktop.minimal',
  productName: 'Beekeeper Studio Minimal',
  files: [...base.files, '!dist/**/*.map'],
  extraMetadata: {
    productName: 'Beekeeper Studio Minimal',
  },
  artifactName: 'Beekeeper-Studio-Minimal-${version}-${arch}.${ext}',
  generateUpdatesFilesForAllChannels: false,
  publish: null,
  mac: {
    ...base.mac,
    target: [{ target: 'dmg', arch: ['arm64'] }],
    identity: '-',
    notarize: false,
    publish: null,
  },
};
