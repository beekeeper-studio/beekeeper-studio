import { ipcRenderer } from 'electron'
import AppEvent from '../../common/AppEvent'

function send(name, arg) {
  ipcRenderer.send(AppEvent.menuClick, name, arg)
}

export default class {

  constructor() {
  }


  quit = () => send('quit')
  undo = () => send('undo')
  redo = () => send('redo')
  cut = () => send('cut')
  copy = () => send('copy')
  paste = () => send('paste')
  selectAll = () => send('selectAll')
  zoomreset = () => send('zoomreset')
  zoomin = () => send('zoomin')
  zoomout = () => send('zoomout')
  fullscreen = () => send('fullscreen')
  about = () => send('about')
  devtools = () => send('devtools')
  newWindow = () => send('newWindow')
  newQuery = () => send('newQuery')
  newTab = () => send('newTab')
  closeTab = () => send('closeTab')
  switchTheme = (theme) => send('switchTheme', theme)
  switchMenuStyle = (style) => send('switchMenuStyle', style)
  reload = () => send('reload')
  disconnect = () => send('disconnect')
  addBeekeeper = () => send('addBeekeeper')

}