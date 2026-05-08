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
  if (extension === '.js' || extension === '.mjs') {
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
        const distRoot = path.resolve(path.join(__dirname, 'renderer'))
        const normalizedPath = path.resolve(path.join(distRoot, pathName))
        log.debug("resolving", pathName, 'to', normalizedPath)
        const extension = path.extname(pathName).toLowerCase()

        // Containment check: refuse anything that escapes dist/renderer.
        if (
          normalizedPath !== distRoot &&
          !normalizedPath.startsWith(distRoot + path.sep)
        ) {
          if (extension === '.map') {
            respond({
              mimeType: 'application/json',
              data: Buffer.from(emptySourceMap),
            })
            return
          }
          respond({ error: -6 })
          return
        }

        readFile(normalizedPath, (error, data) => {
          if (error && extension === '.map') {
            respond({
              mimeType: 'application/json',
              data: Buffer.from(emptySourceMap),
            })
            return
          }
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
      const pluginsRoot = path.resolve(path.join(platformInfo.userDirectory, "plugins"))
      const pluginRoot = path.resolve(path.join(pluginsRoot, pluginId))
      const fullPath = path.resolve(path.join(pluginsRoot, pathName))
      log.debug("resolving", pathName, 'to', fullPath)
      // Containment check: refuse anything that escapes the plugin's own directory.
      if (
        fullPath !== pluginRoot &&
        !fullPath.startsWith(pluginRoot + path.sep)
      ) {
        respond({ error: -6 }) // file not found
        return;
      }
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
        headers['Cache-Control'] = 'no-cache'
        headers['Pragma'] = 'no-cache'
        headers['Expires'] = '0'

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
