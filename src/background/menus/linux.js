import DefaultMenu from './default'

export default class extends DefaultMenu {
  constructor(app, settings) {
    super(app, settings)
  }

  buildTemplate() {
    return [
      {
        label: 'File',
        submenu: [
          this.menuItems.newQuery,
          { role: 'quit' },
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'hide' },
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
          { type: 'separator' },
          this.menuItems.themeToggle
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ]
      },
      {
        label: "Help",
        submenu: [
          { role: 'about' },
          { role: 'toggledevtools' },

        ]
      }
    ]
  }
}