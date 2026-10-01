// Screen recording helpers: a virtual X display plus ffmpeg x11grab.
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

export const SCREEN = { width: 1920, height: 1080 }

export async function startDisplay(display = ':99', size = SCREEN) {
  const xvfb = spawn('Xvfb', [display, '-screen', '0', `${size.width}x${size.height}x24`, '-nolisten', 'tcp', '-ac'], {
    stdio: 'ignore',
  })
  await sleep(1200)
  if (xvfb.exitCode !== null) throw new Error(`Xvfb exited early (${xvfb.exitCode}); is ${display} already in use?`)
  return { display, size, stop: () => xvfb.kill('SIGTERM') }
}

// Lossless-ish capture; finalize.mjs re-encodes it for the web afterwards.
export function startRecording(display, outFile, { fps = 30, size = SCREEN } = {}) {
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(fps),
    '-video_size', `${size.width}x${size.height}`, '-i', `${display}.0`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '16', '-pix_fmt', 'yuv420p',
    outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] })
  const startedAt = Date.now()
  return {
    startedAt,
    elapsed: () => (Date.now() - startedAt) / 1000,
    async stop() {
      ff.stdin.write('q')
      await new Promise((resolve) => ff.on('exit', resolve))
    },
  }
}
