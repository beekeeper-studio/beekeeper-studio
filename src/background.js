'use strict'
import fs from 'fs'
import { app, protocol, BrowserWindow, Menu} from 'electron'
import {
  createProtocol,
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'

import config from './config'
// import QueryRun from './models/query-run'
// import ConnectionConfig from './models/connection-config'

const isDevelopment = process.env.NODE_ENV !== 'production'
const os = process.platform;

const isWindows = os === 'win32'
const isMac = os === 'darwin'
const isLinuxOrBSD = !isWindows && !isMac

// Add onlyl for production -- need for dev
// if(isWindows || isLinuxOrBSD) {
//   Menu.setApplicationMenu(null)
// }


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win


function setupUserDirectory() {
  console.log("userDir: " + config.userDirectory)
  if(!fs.existsSync(config.userDirectory)) {
    fs.mkdirSync(config.userDirectory)
  }
}


async function initializeDB() {
  // await QueryRun.sync({ force: true })
  // await ConnectionConfig.sync({ force: true })
  // await ConnectionConfig.create({
  //   connectionType: 'mysql',
  //   host: '127.0.0.1',
  //   port: 3306,
  //   defaultDatabase: 'employees',
  //   user: 'root',
  //   password: 'example'
  // })

}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])

function createWindow () {
  if (!isDevelopment && !process.env.IS_TEST) {
    Menu.setApplicationMenu(null);
  } 

  // Create the browser window.
  win = new BrowserWindow({ 
    width: 1200, 
    height: 800, 
    titleBarStyle: 'hidden', 
    frame: isLinuxOrBSD, 
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
    },
    icon: './public/icons/png/512x512.png',
  })
  

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
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
      await installVueDevtools()
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  setupUserDirectory()
  await initializeDB()
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
