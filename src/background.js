'use strict'
import fs from 'fs'
import { app, protocol, BrowserWindow} from 'electron'
import _ from 'lodash'
import electron from 'electron'
import path from 'path'
import {
  createProtocol,
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'

import { manageUpdates } from './background/update_manager'

import platformInfo from './common/platform_info'
import MenuHandler from './background/MenuBuilder'
import { UserSetting } from './common/appdb/models/user_setting'
import Connection from './common/appdb/Connection'
import Migration from './migration/index'
const isDevelopment = process.env.NODE_ENV !== 'production'
const debugMode = !!process.env.DEBUG

const { isWindows, isLinux } = platformInfo
console.log(platformInfo)
const ormConnection = new Connection(platformInfo.appDbPath, false)

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let menuHandler

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])

function initUserDirectory(d) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true })
  }
}

initUserDirectory(platformInfo.userDirectory)


async function createWindow () {
  await ormConnection.connect()
  const migrator = new Migration(ormConnection, process.env.NODE_ENV)
  await migrator.run()

  const settings = await UserSetting.all()
  console.log("SETTINGS", settings)
  const theme = settings.theme
  const showFrame = settings.menuStyle && settings.menuStyle.value == 'native' ?  true : false

  menuHandler = new MenuHandler(electron, settings)
  menuHandler.initialize()

  const iconPrefix = isDevelopment ? 'public' : ''
  // Create the browser window.
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: theme.value === 'dark' ? "#000000" : '#ffffff',
    titleBarStyle: 'hidden',
    frame: showFrame,
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
    },
    icon: path.join(__dirname, `${iconPrefix}/icons/png/512x512.png`)
  })

  

  const finishLoadListener = () => {
    win.webContents.reload()
    win.webContents.removeListener('did-finish-load', finishLoadListener)
  }
  if(process.env.WEBPACK_DEV_SERVER_URL && isWindows) {
    win.webContents.on('did-finish-load', finishLoadListener)
  }


  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools();
    console.log("not checking for package updates in dev mode")
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
    if (debugMode) win.webContents.openDevTools();
    manageUpdates(win)
  }

  win.on('closed', () => {
    win = null
  })
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
    createWindow()
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
  createWindow()
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
