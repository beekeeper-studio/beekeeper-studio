import { protocol } from 'electron'
import * as path from 'path'
import { readFile } from 'fs'
import * as fs from 'fs'
import { URL } from 'url'
import rawLog from '@bksLogger'
import platformInfo from '@/common/platform_info'
import bksConfig from "@/common/bksConfig";

const log = rawLog.scope('ProtocolBuilder')

function mimeTypeOf(pathName: string) {
  const extension = path.extname(pathName).toLowerCase()
  if (extension === '.js') {
    return 'text/javascript'
  } else if (extension === '.html') {
    return 'text/html'
  } else if (extension === '.css') {
    return 'text/css'
  } else if (extension === '.svg' || extension === '.svgz') {
    return 'image/svg+xml'
  } else if (extension === '.json') {
    return 'application/json'
  } else if (extension === '.wasm') {
    return 'application/wasm'
  } else if (extension === '.map') {
    return 'application/json'
  }
}

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
          respond({
            mimeType: mimeTypeOf(pathName),
            data,
          })
        })
      }
    )
  },
  createPluginProtocol: () => {
    protocol.registerBufferProtocol("plugin", (request, respond) => {
      // Removes the leading "plugin://" and the query string
      const url = new URL(request.url);
      const pluginId = url.host;
      const pathName = path.join(pluginId, url.pathname);
      const normalized = path.normalize(pathName)
      const fullPath = path.join(platformInfo.userDirectory, "plugins", normalized)
      log.debug("resolving", pathName, 'to', fullPath)
      if (bksConfig.get(`plugins.${pluginId}.disabled`)) {
        respond({ error: -20 }) // blocked by client
        return;
      }
      readFile(fullPath, (error, data) => {
        if (error) {
          log.error("error loading plugin file", pathName, error)
          if (error.code?.toLowerCase() === 'enoent') {
            respond({ error: -6 })
          } else {
            respond({ error: -2 })
          }
          return
        }

        const headers = {}
        if (platformInfo.isDevelopment) {
          headers['Cache-Control'] = 'no-cache'
          headers['Pragma'] = 'no-cache'
          headers['Expires'] = '0'
        }

        const response: any = {
          mimeType: mimeTypeOf(pathName),
          data,
        };
        if (Object.keys(headers).length > 0) {
          response.headers = headers;
        }
        respond(response);
      })
    });
  }
}
