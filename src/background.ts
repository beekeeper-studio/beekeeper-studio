'use strict'
// import '@babel/polyfill'
import * as fs from 'fs'
import { app, protocol } from 'electron'
import log from 'electron-log'
import * as electron from 'electron'
import {
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'

log.transports.file.level = "info"
log.catchErrors({ showDialog: false})
log.info("initializing background")

import { manageUpdates } from './background/update_manager'

import platformInfo from './common/platform_info'
import MenuHandler from './background/NativeMenuBuilder'
import { UserSetting } from './common/appdb/models/user_setting'
import Connection from './common/appdb/Connection'
import Migration from './migration/index'
import { buildWindow } from './background/WindowBuilder'
function initUserDirectory(d: string) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true })
  }
}

if (platformInfo.isDevelopment) {
  log.transports.console.level = "debug"
}

const isDevelopment = process.env.NODE_ENV !== 'production'

initUserDirectory(platformInfo.userDirectory)
log.info("initializing user ORM connection")
const ormConnection = new Connection(platformInfo.appDbPath, false)

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let menuHandler
log.info("registering schema")
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])


async function createFirstWindow () {
  log.info("Creating first window")
  await ormConnection.connect()
  log.info("running migrations")
  const migrator = new Migration(ormConnection, process.env.NODE_ENV)
  await migrator.run()

  log.info("getting settings")
  const settings = await UserSetting.all()

  log.info("setting up the menu")
  menuHandler = new MenuHandler(electron, settings)
  menuHandler.initialize()
  log.info("Building the window")
  buildWindow(settings)
  log.info("managing updates")
  manageUpdates()
}


// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async (event, hasVisibleWindows) => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!hasVisibleWindows) {
    const settings = await UserSetting.all()
    buildWindow(settings)
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      console.log("installing vue devtools")
      await installVueDevtools()
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createFirstWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
