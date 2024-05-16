import { protocol } from 'electron'
import * as path from 'path'
import { readFile } from 'fs'
import { URL } from 'url'

export const ProtocolBuilder = {

  createAppProtocol: () => {
    protocol.registerBufferProtocol(
      'app',
      (request, respond) => {
        let pathName = new URL(request.url).pathname
        pathName = decodeURI(pathName) // Needed in case URL contains spaces

        // our app runs from dist/, regardless of whether this is inside of the
        // app.asar file, but we want to not allow loading of content from outside of
        // the dist directory
        const normalizedPath = path.normalize(path.join(__dirname, pathName))

        readFile(normalizedPath, (error, data) => {
          if (error) {
            console.error(
              `Failed to read ${pathName} on 'app' protocol`,
              error
            )
          }
          const extension = path.extname(pathName).toLowerCase()
          let mimeType = ''

          if (extension === '.js') {
            mimeType = 'text/javascript'
          } else if (extension === '.html') {
            mimeType = 'text/html'
          } else if (extension === '.css') {
            mimeType = 'text/css'
          } else if (extension === '.svg' || extension === '.svgz') {
            mimeType = 'image/svg+xml'
          } else if (extension === '.json') {
            mimeType = 'application/json'
          } else if (extension === '.wasm') {
            mimeType = 'application/wasm'
          }

          respond({ mimeType, data })
        })
      }
    )
  }
}
