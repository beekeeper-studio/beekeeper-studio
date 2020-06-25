import MenuActions from "../common/MenuActions"


export default class {

  electron
  window

  constructor(electron, window) {
    this.electron = electron
    this.window = window
  }

  listen() {

    this.electron.nativeTheme.on('updated', () => {
      window.send(MenuActions.CHECKTHEME)
    })
  }

}