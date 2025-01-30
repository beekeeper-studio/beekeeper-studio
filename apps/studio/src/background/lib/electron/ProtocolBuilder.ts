import { protocol } from 'electron'
import * as path from 'path'
import { readFile } from 'fs'
import * as fs from 'fs'
import { URL } from 'url'
import rawLog from '@bksLogger'
import platformInfo from '@/common/platform_info'

const log = rawLog.scope('app:// ProtocolBuilder')



export const ProtocolBuilder = {

  // app:// loads from dist/renderer
  createAppProtocol: () => {
    protocol.registerBufferProtocol(
      'app',
      (request, respond) => {
        let pathName = new URL(request.url).pathname
        pathName = decodeURI(pathName) // Needed in case URL contains spaces

        const emptySourceMap = JSON.stringify({
          version: 3,
          file: request.url,
          sources: [],
          names: [],
          mappings: ''
        });


        // our app runs from dist/, regardless of whether this is inside of the
        // app.asar file, but we want to not allow loading of content from outside of
        // the dist directory
        let normalizedPath = path.normalize(path.join(__dirname, 'renderer', pathName))
        log.debug("resolving", pathName, 'to', normalizedPath)
        const extension = path.extname(pathName).toLowerCase()
        if (extension === '.map' && platformInfo.isDevelopment) {
          // we want to check the directory and resolve it
          if (!fs.existsSync(normalizedPath)) {
            // probably some weird path like:
            // app://./home/rathboma/Projects/beekeeper-studio/studio/node_modules/@google-cloud/bigquery/build/src/rowQueue.js.map
            normalizedPath = pathName
          }
        }

        readFile(normalizedPath, (error, data) => {

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
          } else if (extension === '.map') {
            mimeType = 'application/json'
          }

          respond({ mimeType, data })
        })
      }
    )
  }
}
