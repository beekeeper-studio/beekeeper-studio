import { execFileSync } from "child_process";
import { AutoUpdater } from "electron";
import { MacUpdater, ResolvedUpdateFileInfo, UpdateDownloadedEvent } from "electron-updater";
import { newError, safeStringifyJson } from "builder-util-runtime";
import { DownloadUpdateOptions } from "electron-updater/out/AppUpdater";
import { findFile } from "electron-updater/out/providers/Provider";
import { createReadStream } from "fs";
import { stat } from 'fs-extra';
import { createServer, IncomingMessage, ServerResponse } from "http";
import { AddressInfo } from "net";

// Most code in this file copyright Loopline Systems
// https://github.com/electron-userland/electron-builder/blob/master/LICENSE


export class PickyMacUpdater extends MacUpdater {
  // eslint-disable-next-line
  private readonly pickyNativeUpdater: AutoUpdater = require("electron").autoUpdater

  // TODO (matthew) Hopefully the PR gets merged and this functionality can be part of the regular package
  // https://github.com/electron-userland/electron-builder/pull/6852
  protected maintainX86 = true

  private dbg(message: string): void {
    if (this._logger.debug != null) {
      this._logger.debug(message)
    }
  }

  protected async doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>> {
    let files = downloadUpdateOptions.updateInfoAndProvider.provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info)

    const log = this._logger

    // detect if we are running inside Rosetta emulation
    const sysctlRosettaInfoKey = "sysctl.proc_translated"
    let isRosetta = false
    try {
      this.dbg("Checking for macOS Rosetta environment")
      const result = execFileSync("sysctl", [sysctlRosettaInfoKey], { encoding: "utf8" })
      isRosetta = result.includes(`${sysctlRosettaInfoKey}: 1`)
      log.info(`Checked for macOS Rosetta environment (isRosetta=${isRosetta})`)
    } catch (e) {
      log.warn(`sysctl shell command to check for macOS Rosetta environment failed: ${e}`)
    }

    let isArm64Mac = false
    try {
      this.dbg("Checking for arm64 in uname")
      const result = execFileSync("uname", ["-a"], { encoding: "utf8" })
      const isArm = result.includes("ARM")
      log.info(`Checked 'uname -a': arm64=${isArm}`)
      isArm64Mac = isArm64Mac || isArm
    } catch (e) {
      log.warn(`uname shell command to check for arm64 failed: ${e}`)
    }

    isArm64Mac = isArm64Mac || process.arch === "arm64" || isRosetta

    isArm64Mac = isArm64Mac && isRosetta && this.maintainX86 ? false : isArm64Mac;

    // allow arm64 macs to install universal or rosetta2(x64) - https://github.com/electron-userland/electron-builder/pull/5524
    const isArm64 = (file: ResolvedUpdateFileInfo) => file.url.pathname.includes("arm64") || file.info.url?.includes("arm64")
    if (isArm64Mac && files.some(isArm64)) {
      files = files.filter(file => isArm64Mac === isArm64(file))
    } else {
      files = files.filter(file => !isArm64(file))
    }

    const zipFileInfo = findFile(files, "zip", ["pkg", "dmg"])

    if (zipFileInfo == null) {
      throw newError(`ZIP file not provided: ${safeStringifyJson(files)}`, "ERR_UPDATER_ZIP_FILE_NOT_FOUND")
    }

    return this.executeDownload({
      fileExtension: "zip",
      fileInfo: zipFileInfo,
      downloadUpdateOptions,
      task: (destinationFile, downloadOptions) => {
        // @ts-expect-error (marked as internal)
        return this.httpExecutor.download(zipFileInfo.url, destinationFile, downloadOptions)
      },
      done: event => this.pickyUpdateDownloaded(zipFileInfo, event),
    })

  }

  private async pickyUpdateDownloaded(zipFileInfo: ResolvedUpdateFileInfo, event: UpdateDownloadedEvent): Promise<Array<string>> {
    const downloadedFile = event.downloadedFile
    const updateFileSize = zipFileInfo.info.size ?? (await stat(downloadedFile)).size

    const log = this._logger
    const logContext = `fileToProxy=${zipFileInfo.url.href}`
    this.dbg(`Creating proxy server for native Squirrel.Mac (${logContext})`)
    const server = createServer()
    this.dbg(`Proxy server for native Squirrel.Mac is created (${logContext})`)
    server.on("close", () => {
      log.info(`Proxy server for native Squirrel.Mac is closed (${logContext})`)
    })

    // must be called after server is listening, otherwise address is null
    function getServerUrl(): string {
      const address = server.address() as AddressInfo
      return `http://127.0.0.1:${address.port}`
    }

    return await new Promise<Array<string>>((resolve, reject) => {
      // insecure random is ok
      const fileUrl = `/${Date.now().toString(16)}-${Math.floor(Math.random() * 9999).toString(16)}.zip`
      server.on("request", (request: IncomingMessage, response: ServerResponse) => {
        const requestUrl = request.url!
        log.info(`${requestUrl} requested`)
        if (requestUrl === "/") {
          const data = Buffer.from(`{ "url": "${getServerUrl()}${fileUrl}" }`)
          response.writeHead(200, { "Content-Type": "application/json", "Content-Length": data.length })
          response.end(data)
          return
        }

        if (!requestUrl.startsWith(fileUrl)) {
          log.warn(`${requestUrl} requested, but not supported`)
          response.writeHead(404)
          response.end()
          return
        }

        log.info(`${fileUrl} requested by Squirrel.Mac, pipe ${downloadedFile}`)

        let errorOccurred = false
        response.on("finish", () => {
          try {
            setImmediate(() => server.close())
          } finally {
            if (!errorOccurred) {
              this.pickyNativeUpdater.removeListener("error", reject)
              resolve([])
            }
          }
        })

        const readStream = createReadStream(downloadedFile)
        readStream.on("error", error => {
          try {
            response.end()
          } catch (e) {
            log.warn(`cannot end response: ${e}`)
          }
          errorOccurred = true
          this.pickyNativeUpdater.removeListener("error", reject)
          reject(new Error(`Cannot pipe "${downloadedFile}": ${error}`))
        })

        response.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Length": updateFileSize,
        })
        readStream.pipe(response)
      })

      this.dbg(`Proxy server for native Squirrel.Mac is starting to listen (${logContext})`)
      server.listen(0, "127.0.0.1", () => {
        this.dbg(`Proxy server for native Squirrel.Mac is listening (address=${getServerUrl()}, ${logContext})`)
        this.pickyNativeUpdater.setFeedURL({
          url: getServerUrl(),
          headers: { "Cache-Control": "no-cache" },
        })

        // The update has been downloaded and is ready to be served to Squirrel
        this.dispatchUpdateDownloaded(event)

        if (this.autoInstallOnAppQuit) {
          this.pickyNativeUpdater.once("error", reject)
          // This will trigger fetching and installing the file on Squirrel side
          this.pickyNativeUpdater.checkForUpdates()
        } else {
          resolve([])
        }
      })
    })
  }

}
