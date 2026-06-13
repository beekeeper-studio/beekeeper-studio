# vendor/

Local packages referenced from `package.json` / `pnpm-workspace.yaml`.

## empty-package/

A stub package used to neuter `cpu-features` (an optional native dependency
of `ssh2`) via the pnpm override in `pnpm-workspace.yaml`. It breaks
cross-platform Electron builds and `ssh2` works fine without it.

## xel-0.0.220-137f7903.tgz

Snapshot of https://github.com/beekeeper-studio/xel at commit
`137f79035d4379a4bdd98efd3f12d6683ec42375` (the GitHub source tarball,
unmodified). Vendored as a tarball because the fork's `.npmignore` strips
`xel.js` when package managers apply npm pack rules to git-hosted
dependencies (pnpm and npm do; yarn 1 did not), and remote-tarball
dependencies hit a pnpm lockfile-integrity quirk. A `file:` tarball is
extracted as-is with no integrity or pack-rule concerns.

To update: download a new commit tarball from
`https://api.github.com/repos/beekeeper-studio/xel/tarball/<commit>`,
name it `xel-<version>-<short-commit>.tgz`, and update the `xel` entry in
`apps/studio/package.json`.
