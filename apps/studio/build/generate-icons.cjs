// Render every app icon from the same vector source using the bundled Electron.
// Run on macOS: yarn workspace beekeeper-studio icons:build
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const studio = path.resolve(__dirname, '..');
const icons = path.join(studio, 'public/icons');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'beekeeper-icons-'));
app.setPath('userData', path.join(temporary, 'profile'));
app.commandLine.appendSwitch('force-device-scale-factor', '1');

function writeWindowsIcon(images) {
  const directory = Buffer.alloc(6 + images.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    directory[entry] = size === 256 ? 0 : size;
    directory[entry + 1] = size === 256 ? 0 : size;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  fs.writeFileSync(path.join(icons, 'win/favicon.ico'),
    Buffer.concat([directory, ...images.map(({ png }) => png)]));
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1024, height: 1024, useContentSize: true,
    show: false, frame: false, transparent: true,
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false },
  });
  const svg = fs.readFileSync(path.join(studio, 'src/assets/logo.svg'), 'utf8');
  await window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
    `<style>html,body{margin:0;width:1024px;height:1024px;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`));
  await window.webContents.executeJavaScript(
    'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const rendered = await window.webContents.capturePage();
  const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];
  const images = sizes.map(size => {
    const png = rendered.resize({ width: size, height: size, quality: 'best' }).toPNG();
    fs.writeFileSync(path.join(icons, `png/${size}x${size}.png`), png);
    return { size, png };
  });
  writeWindowsIcon(images.filter(({ size }) => size <= 256));

  if (process.platform === 'darwin') {
    const iconset = path.join(temporary, 'minimal.iconset');
    fs.mkdirSync(iconset);
    for (const size of [16, 32, 128, 256, 512]) {
      for (const scale of [1, 2]) {
        fs.copyFileSync(path.join(icons, `png/${size * scale}x${size * scale}.png`),
          path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`));
      }
    }
    execFileSync('iconutil', ['-c', 'icns', '-o', path.join(icons, 'mac/bk-icon.icns'), iconset]);
  }
  console.log(`Generated ${images.length} PNG sizes, Windows ICO${process.platform === 'darwin' ? ', and macOS ICNS' : ''}.`);
  window.destroy();
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => app.quit());

app.on('quit', () => fs.rmSync(temporary, { recursive: true, force: true }));
