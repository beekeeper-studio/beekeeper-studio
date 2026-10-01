// Turn the raw capture into website-ready files.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' })

export function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())
}

// H.264 High, yuv420p, faststart (plays before it fully downloads), no audio track.
export function encodeForWeb(raw, out, { fadeIn = 0.6, fadeOut = 1.0, crf = 20 } = {}) {
  const d = duration(raw)
  ff(['-i', raw,
    '-vf', `fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${(d - fadeOut).toFixed(2)}:d=${fadeOut}`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out])
}

export function posterFrame(video, out, atSeconds = 2) {
  ff(['-ss', String(atSeconds), '-i', video, '-frames:v', '1', out])
}

// "m:ss Name" lines (YouTube chapter format) from Director marks.
export function writeChapters(marks, names, file) {
  const lines = marks.filter((m) => names[m.label])
    .map((m) => `${Math.floor(m.t / 60)}:${String(Math.floor(m.t % 60)).padStart(2, '0')} ${names[m.label]}`)
  fs.writeFileSync(file, lines.join('\n') + '\n')
}

// Some viewers (e.g. the Claude app) only play an .mp4 inline; a zip downloads.
export function zipFiles(zipPath, files) {
  fs.rmSync(zipPath, { force: true })
  try {
    execFileSync('zip', ['-q', '-j', '-0', zipPath, ...files])
  } catch {
    execFileSync('python3', ['-c',
      'import os,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],"w")\nfor f in sys.argv[2:]: z.write(f, os.path.basename(f))\nz.close()',
      zipPath, ...files])
  }
}

export function finalize({ outDir, name, raw = path.join(outDir, 'raw.mp4'), marks = [], chapters = {}, posterAt = 2 }) {
  const video = path.join(outDir, `${name}.mp4`)
  encodeForWeb(raw, video)
  posterFrame(video, path.join(outDir, `${name}-poster.png`), posterAt)
  writeChapters(marks, chapters, path.join(outDir, 'chapters.txt'))
  zipFiles(path.join(outDir, `${name}.zip`), [video])
  return video
}
