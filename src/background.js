'use strict'
// import '@babel/polyfill'
import fs from 'fs'
import { app, protocol } from 'electron'
import electron from 'electron'
import {
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'
import log from 'electron-log'

log.catchErrors({
  showDialog: false,
  onError(error) {
    electron.dialog.showMessageBoxSync({
      title: "ERROR",
      message: error.message,
      detail: error.stack,
      type: 'error',
      buttons: ['Oh']
    })
  }
})

import { manageUpdates } from './background/update_manager'

import platformInfo from './common/platform_info'
import MenuHandler from './background/NativeMenuBuilder'
import { UserSetting } from './common/appdb/models/user_setting'
import Connection from './common/appdb/Connection'
import Migration from './migration/index'
import { buildWindow } from './background/WindowBuilder'
function initUserDirectory(d) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true })
  }
}


log.info("Starting background.js")
const isDevelopment = process.env.NODE_ENV !== 'production'
initUserDirectory(platformInfo.userDirectory)
log.info("making ORM connection")
const ormConnection = new Connection(platformInfo.appDbPath, false)

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let menuHandler

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])


async function createFirstWindow () {
  await ormConnection.connect()
  const migrator = new Migration(ormConnection, process.env.NODE_ENV)
  await migrator.run()

  const settings = await UserSetting.all()

  menuHandler = new MenuHandler(electron, settings)
  menuHandler.initialize()
  buildWindow(settings)
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

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createFirstWindow()
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
