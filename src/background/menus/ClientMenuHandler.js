

export default class {
  app = null
  settings = null

  /**
   * @param  {} app
   * @param  {} settings
   */
  constructor(electron, app, settings) {
    this.app = app
    this.settings = settings
    this.electron = electron
  }

  initialize() {
    // should do stuff here.
  }
}