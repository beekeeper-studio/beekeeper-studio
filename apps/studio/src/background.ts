'use strict'
import 'module-alias/register';
import * as fs from 'fs'
import path from 'path'
import { app, protocol } from 'electron'
import log from 'electron-log'
import * as electron from 'electron'
import { ipcMain } from 'electron'
import _ from 'lodash'

// eslint-disable-next-line
require('@electron/remote/main').initialize()
log.transports.file.level = "info"
log.catchErrors({ showDialog: false})
log.info("initializing background")

import { manageUpdates } from './background/update_manager'

import MenuHandler from './background/NativeMenuBuilder'
import { IGroupedUserSettings, UserSetting } from './common/appdb/models/user_setting'
import Connection from './common/appdb/Connection'
import Migration from './migration/index'
import { buildWindow, getActiveWindows } from './background/WindowBuilder'
import platformInfo from './common/platform_info'

import { AppEvent } from './common/AppEvent'
import { ProtocolBuilder } from './background/lib/electron/ProtocolBuilder';
import { uuidv4 } from './lib/uuid';


function initUserDirectory(d: string) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true })
  }
}

let utilityProcess: Electron.UtilityProcess
// don't need this
let newWindows: number[] = new Array();

function createUtilityProcess() {
  if (utilityProcess) {
    return;
  }

  const args = {
    isPackage: `${electron.app.isPackaged}`,
    locale: electron.app.getLocale(),
    userDir: electron.app.getPath('userData'),
    downloadDir: electron.app.getPath('downloads'),
    homeDir: electron.app.getPath('home'),
    shouldUseDarkColors: `${electron.nativeTheme.shouldUseDarkColors}`,
    version: electron.app.getVersion()
  }

  utilityProcess = electron.utilityProcess.fork(
    path.join(__dirname, 'utility.js'),
    [],
    {
      env: { ...process.env, ...args },
      stdio: ['ignore', 'pipe', 'pipe'],
      serviceName: 'BeekeeperUtility'
    }
  );

  const utilLog = log.scope('UTILITY')

  utilityProcess.stdout.on('data', (chunk) => {
    utilLog.log(chunk.toString())
  })

  utilityProcess.stderr.on('data', (chunk) => {
    utilLog.error(chunk.toString())
  })

  utilityProcess.on('exit', (code) => {
    // if non zero exit code
    console.log("UTILITY DEAD", code)
    if (code) {
      utilLog.info('Utility process died, restarting')
      utilityProcess = null;
      createUtilityProcess();
      createAndSendPorts(false, true);
    }
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
let initialized = false

async function initBasics() {
  // this creates the app:// protocol we use for loading assets
  ProtocolBuilder.createAppProtocol()
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

  log.debug("setting up the menu")
  menuHandler = new MenuHandler(electron, settings)
  menuHandler.initialize()
  log.debug("Building the window")
  log.debug("managing updates")
  manageUpdates()
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async (_event, hasVisibleWindows) => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!hasVisibleWindows) {
    if (!settings) throw "No settings initialized!"
    buildWindow(settings)

    // NOTE (@day): we should only be calling this once. make a decision
    createUtilityProcess()
  }
})

// for sending ports to new windows
app.on('browser-window-created', (event: electron.Event, window: electron.BrowserWindow) => {
  log.log('window created!!!', event, window);

  newWindows.push(window.id);
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
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
      await buildWindow(settings)
      // NOTE (@day): we should only be calling this once. make a decision
      createUtilityProcess()
    }
  }

})

function createAndSendPorts(filter: boolean, utilDied: boolean = false) {
  getActiveWindows().forEach((w) => {
    if (!filter || newWindows.includes(w.winId)) {
      const { port1, port2 } = new electron.MessageChannelMain();
      const sId = uuidv4();
      log.info('SENDING PORT TO RENDERER: ', sId)
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

ipcMain.on('ready', (_event) => {
  createAndSendPorts(true);
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

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  const rendererTrigger = 'tmp/restart-renderer'

  // after messing around with SIGUSR, I just use a file, so much easier.
  fs.watchFile(rendererTrigger, (current, previous) => {
    if (current.mtime !== previous.mtime)
      console.log("reloading webcontents")
      getActiveWindows().forEach((w) => w.webContents.reload())
  })

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

