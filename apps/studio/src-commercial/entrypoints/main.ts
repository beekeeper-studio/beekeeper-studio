'use strict'
import * as fs from 'fs'
import path from 'path'
import { app, protocol } from 'electron'
import * as electron from 'electron'
import { ipcMain } from 'electron'
import _ from 'lodash'
import log from '@bksLogger'

// eslint-disable-next-line
require('@electron/remote/main').initialize()
log.info("initializing background")


import MenuHandler from '@/background/NativeMenuBuilder'
import { IGroupedUserSettings, UserSetting } from '@/common/appdb/models/user_setting'
import Connection from '@/common/appdb/Connection'
import Migration from '@/migration/index'
import { buildWindow, getActiveWindows, getCurrentWindow } from '@/background/WindowBuilder'
import platformInfo from '@/common/platform_info'
import bksConfig from '@/common/bksConfig'

import { AppEvent } from '@/common/AppEvent'
import { ProtocolBuilder } from '@/background/lib/electron/ProtocolBuilder';
import { uuidv4 } from '@/lib/uuid';
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';
import { UtilProcMessage } from '@/types'
import { manageUpdates } from '@/background/update_manager'
import * as sms from 'source-map-support'
import { initializeSecurity } from '@/backend/lib/security'
import { initializeFileHelpers } from '@/backend/lib/FileHelpers'

if (platformInfo.env.development || platformInfo.env.test) {
  sms.install()
}

function initUserDirectory(d: string) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true })
  }
}

let utilityProcess: Electron.UtilityProcess
let newWindows: number[] = [];

async function createUtilityProcess() {
  if (utilityProcess) {
    return;
  }

  const args = {
    bksPlatformInfo: JSON.stringify(platformInfo),
    bksConfigSource: JSON.stringify(bksConfig.source),
  }

  utilityProcess = electron.utilityProcess.fork(
    path.join(__dirname, 'utility.js'),
    [],
    {
      env: { ...process.env, ...args },
      stdio: ['ignore', 'inherit', 'inherit'],
      serviceName: 'BeekeeperUtility'
    }
  );


  utilityProcess.on('exit', async (code) => {
    // if non zero exit code
    log.log("UTILITY DEAD", code)
    if (code) {
      log.info('Utility process died, restarting')
      utilityProcess = null;
      await createUtilityProcess();
      createAndSendPorts(false, true);
    }
  })

  utilityProcess.on("message", (msg: UtilProcMessage) => {
    if (msg.type === 'openExternal') {
      electron.shell.openExternal(msg.url)
    }
  })

  utilityProcess.postMessage({ type: 'init' });
  return new Promise<void>((resolve, _reject) => {
    utilityProcess.on('message', (msg: UtilProcMessage) => {
      if (msg.type === 'ready') {
        resolve()
      }
    })
  })
}


const transports = [log.transports.console, log.transports.file]
if (platformInfo.isDevelopment || platformInfo.debugEnabled) {
  transports.forEach(t => t.level = 'silly')
} else {
  transports.forEach(t => t.level = 'warn')
}

const isDevelopment = platformInfo.isDevelopment

initUserDirectory(platformInfo.userDirectory)
log.info("initializing user ORM connection!")
const ormConnection = new Connection(platformInfo.appDbPath, false)
log.debug("ELECTRON BOOTING")
log.debug("####################################")

log.debug("Platform Information (Electron)")
log.debug(JSON.stringify(platformInfo, null, 2))
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let settings: IGroupedUserSettings
let menuHandler
log.debug("registering schema")
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])
protocol.registerSchemesAsPrivileged([{scheme: 'plugin', privileges: { secure: true, standard: true } }])
let initialized = false

async function initBasics() {
  // this creates the app:// protocol we use for loading assets
  ProtocolBuilder.createAppProtocol()
  // this creates the plugin:// protocol we use for loading plugins
  ProtocolBuilder.createPluginProtocol()
  if (initialized) return settings
  initialized = true
  await ormConnection.connect()
  console.log("LD_LIBRARY_PATH", process.env.LD_LIBRARY_PATH)
  log.info("running migrations!!")
  const migrator = new Migration(ormConnection, process.env.NODE_ENV)
  await migrator.run()


  log.debug("getting settings")
  settings = await UserSetting.all()

  if (settings.oracleInstantClient) {
    process.env['LD_LIBRARY_PATH'] = `${process.env.LD_LIBRARY_PATH}:${settings.oracleInstantClient.value}`
  }

  const defaultChannel = settings.useBeta.defaultValue === 'true' ? 'beta' : 'stable'
  // we should change the default channel based on the current app channel
  if (platformInfo.parsedAppVersion.channel !== defaultChannel) {
    settings.useBeta.defaultValue = platformInfo.parsedAppVersion.channel === 'beta' ? 'true' : 'false'
    log.debug("Updating the default channel to", platformInfo.parsedAppVersion.channel)
    await settings.useBeta.save()
  }

  log.debug("setting up the menu")
  menuHandler = new MenuHandler(electron, settings, bksConfig)
  menuHandler.initialize()
  log.debug("Building the window")
  log.debug("managing updates")
  manageUpdates(settings.useBeta.valueAsBool)
  ipcMain.on(AppEvent.openExternally, (_e: electron.IpcMainEvent, args: any[]) => {
    const url = args[0]
    if (!url) return
    electron.shell.openExternal(url)
  })
  return settings
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  ipcMain.emit("disable-connection-menu-items");

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('platformInfo', () => {
  return platformInfo;
})

ipcMain.handle('bksConfigSource', () => {
  return bksConfig.source;
})

app.on('activate', async (_event, hasVisibleWindows) => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!hasVisibleWindows) {
    if (!settings) throw "No settings initialized!"
    await createUtilityProcess()

    buildWindow(settings)
  }
})

// for sending ports to new windows
app.on('browser-window-created', (_event: electron.Event, window: electron.BrowserWindow) => {
  log.log('window created!!!');

  newWindows.push(window.id);
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {

      installExtension('iaajmlceplecbljialhhkmedjlpdblhp')
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err));
    // Need to explicitly disable CORS when running in dev mode because
    // we can't connect to bigquery-emulator on localhost.
    // See: https://github.com/electron/electron/issues/23664
    console.log("Dev mode detected, disabling CORS")
    app.commandLine.appendSwitch('disable-web-security');
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')

  }

  // this gets positional arguments
  const options = platformInfo.parsedArgs._.map((url: string) => ({ url }))
  const settings = await initBasics()

  if (options.length > 0) {

    await Promise.all(options.map((option) => buildWindow(settings, option)))
  } else {
    if (getActiveWindows().length === 0) {
      const settings = await initBasics()
      initializeSecurity(app);
      initializeFileHelpers();
      await createUtilityProcess()

      await buildWindow(settings)
    }
  }

})

function createAndSendPorts(filter: boolean, utilDied = false) {
  getActiveWindows().forEach((w) => {
    if (!filter || newWindows.includes(w.winId)) {
      const { port1, port2 } = new electron.MessageChannelMain();
      const sId = uuidv4();
      log.info('SENDING PORT TO RENDERER: ', sId)
      w.sId = sId;
      utilityProcess.postMessage({ type: 'init', sId }, [port1]);
      w.webContents.postMessage('port', { sId, utilDied }, [port2]);
      w.onClose((_event: electron.Event) => {
        utilityProcess.postMessage({ type: 'close', sId })
      })
      if (filter) {
        newWindows = _.without(newWindows, w.winId);
      }
    }
  })
}

ipcMain.handle('requestPorts', async () => {
  log.info('Client requested ports');
  if (!utilityProcess || !utilityProcess.pid) {
    log.info('NO UTIL PROCESS')
    utilityProcess = null;
    await createUtilityProcess();
  }

  if (newWindows.length > 0) {
    createAndSendPorts(true);
  } else {
    createAndSendPorts(false);
  }
})

// Open a connection from a file (e.g. ./sqlite.db)
app.on('open-file', async (event, file) => {
  event.preventDefault();
  const settings = await initBasics()
  await buildWindow(settings, { url: file })
});

// Open a connection from a url (e.g. postgres://host)
app.on('open-url', async (event, url) => {
  event.preventDefault();
  const settings = await initBasics()

  await buildWindow(settings, { url })
});

ipcMain.handle('isMaximized', () => {
  return getCurrentWindow().isMaximized();
})

ipcMain.handle('isFullscreen', () => {
  return getCurrentWindow().isFullscreen();
})

ipcMain.handle('setFullscreen', (_event, value) => {
  getCurrentWindow().setFullscreen(value);
})

ipcMain.handle('minimizeWindow', () => {
  getCurrentWindow().minimizeWindow();
})

ipcMain.handle('unmaximizeWindow', () => {
  getCurrentWindow().unmaximizeWindow();
})

ipcMain.handle('maximizeWindow', () => {
  getCurrentWindow().maximizeWindow();
})

ipcMain.handle('closeWindow', () => {
  getCurrentWindow().closeWindow();
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  const rendererTrigger = path.join(process.cwd(), 'tmp/restart-renderer')

  // after messing around with SIGUSR, I just use a file, so much easier.
  if (fs.existsSync(rendererTrigger)) {
    fs.watchFile(rendererTrigger, (current, previous) => {
      if (current.mtime !== previous.mtime)
        console.log("reloading webcontents")
        getActiveWindows().forEach((w) => w.webContents.reload())
    })
  } else {
    console.log('not watching for restart trigger, file does not exist')
  }

  console.log("Setting DEV KILL flags")
  process.on('message', data => {
    if (data === 'graceful-exit') {
      app.quit()
    }
  })

  process.on('SIGTERM', () => {
    app.quit()
  })

}

