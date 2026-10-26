#!/usr/bin/env node
/*
 * Mirror a published GitHub release into the downloads R2 bucket, and refresh
 * the latest.json manifest the website resolves downloads from.
 *
 * Usage: node mirror_release_downloads.js <tag>
 *
 * Ordering matters: binaries upload first, the manifest last, so latest.json
 * never references an object that isn't in the bucket yet. Uploads overwrite,
 * so re-running (via workflow_dispatch) is safe and heals partial runs.
 *
 * Shells out to `gh` for release reads/downloads and `aws` for R2 uploads;
 * both are preinstalled on GitHub runners.
 *
 * Required env:
 *   GH_TOKEN         - GitHub token for release reads
 *   R2_BUCKET        - target bucket name
 *   R2_ENDPOINT      - S3-compatible endpoint URL
 *   PUBLIC_BASE_URL  - public origin serving the bucket (custom domain)
 *   LATEST_TAG       - tag GitHub reports as the latest release (resolved by
 *                      the workflow before this script runs); latest.json is
 *                      only written when it matches the mirrored tag
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY - R2 credentials
 */

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const REPO = 'beekeeper-studio/beekeeper-studio'

// Run a command, streaming its output to the log.
function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' })
}

// Run a command and return its stdout as a string.
function capture(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim()
}

// extension/arch/type must stay in lockstep with the website's matching logic
// (web repo: _assets/js/lib/github.js GithubAsset + controllers/download.js).
function assetEntry(asset, urlBase) {
  const name = asset.name
  const extension = name.split('.').pop()

  const arch = name.includes('arm64') || name.includes('aarch64') ? 'arm64' : 'x86_64'

  const type = extension === 'exe' && name.includes('portable') ? 'portable' : 'installer'

  return {
    name,
    size: asset.size,
    content_type: asset.contentType,
    extension,
    arch,
    type,
    url: `${urlBase}/${encodeURIComponent(name)}`,
  }
}

function upload(file, dest, contentType, cacheControl) {
  run('aws', [
    's3', 'cp', file, dest,
    '--endpoint-url', process.env.R2_ENDPOINT,
    '--content-type', contentType,
    '--cache-control', cacheControl,
  ])
}

function main() {
  const tag = process.argv[2]
  if (!tag) {
    console.error('usage: mirror_release_downloads.js <tag>')
    process.exit(1)
  }
  for (const name of ['GH_TOKEN', 'R2_BUCKET', 'R2_ENDPOINT', 'PUBLIC_BASE_URL', 'LATEST_TAG']) {
    if (!process.env[name]) {
      console.error(`missing required env: ${name}`)
      process.exit(1)
    }
  }

  const { R2_BUCKET, PUBLIC_BASE_URL } = process.env
  const prefix = `releases/${tag}`

  const release = JSON.parse(capture('gh', [
    'release', 'view', tag, '--repo', REPO,
    '--json', 'tagName,publishedAt,isDraft,isPrerelease,assets',
  ]))

  if (release.isDraft) {
    console.log(`${tag} is a draft; nothing to mirror.`)
    return
  }

  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-release-'))
  try {
    console.log(`Found ${release.assets.length} assets on ${tag}:`)
    for (const asset of release.assets) {
      console.log(`  - ${asset.name} (${asset.size} bytes)`)
    }

    // Binaries never change once released - cache them hard. Each asset is
    // downloaded, uploaded, and deleted individually: the log shows exactly
    // how far a run got, and disk usage stays at one asset instead of the
    // whole release.
    release.assets.forEach((asset, i) => {
      const progress = `[${i + 1}/${release.assets.length}] ${asset.name}`
      const file = path.join(workdir, asset.name)
      console.log(`${progress}: downloading`)
      run('gh', ['release', 'download', tag, '--repo', REPO, '--dir', workdir, '--pattern', asset.name])
      console.log(`${progress}: uploading`)
      upload(
        file,
        `s3://${R2_BUCKET}/${prefix}/${asset.name}`,
        asset.contentType,
        'public, max-age=31536000, immutable'
      )
      fs.rmSync(file)
      console.log(`${progress}: done`)
    })

    // Only the release GitHub reports as latest may write the manifest. This
    // one rule covers prereleases, re-published old versions, and
    // near-simultaneous publishes: drafts and prereleases are never "latest",
    // and whatever order concurrent runs finish in, the manifest converges on
    // the canonical latest. The lookup itself happens in an earlier workflow
    // step (so a bad API response fails the run before any downloads); this
    // script only compares.
    if (process.env.LATEST_TAG !== tag) {
      console.log(`${tag} is not the latest release (${process.env.LATEST_TAG} is): assets mirrored, latest.json untouched.`)
      return
    }

    // electron-updater metadata (*.yml, *.blockmap) is mirrored above but
    // excluded from the manifest - it is not a user-facing download.
    const manifest = {
      tag_name: release.tagName,
      version: release.tagName.replace(/^v/, ''),
      published_at: release.publishedAt,
      assets: release.assets
        .filter((asset) => !/\.(yml|blockmap)$/.test(asset.name))
        .map((asset) => assetEntry(asset, `${PUBLIC_BASE_URL}/${prefix}`)),
    }

    const manifestFile = path.join(workdir, 'latest.json')
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
    upload(manifestFile, `s3://${R2_BUCKET}/latest.json`, 'application/json', 'public, max-age=60')

    console.log(`Mirrored ${tag} to ${prefix} and updated latest.json`)
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
}

main()
