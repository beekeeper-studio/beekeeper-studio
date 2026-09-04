import {NativePlugin} from './lib/NativeWrapper'
import Vue from 'vue'
import Noty from 'noty'
import { RootBinding, AppEvent } from './common/AppEvent'
import { BeekeeperPlugin } from './plugins/BeekeeperPlugin'
import BksConfig from './common/bksConfig'
import { createVHotkeyKeymap, createCodemirroKeymap } from './plugins/ConfigPlugin'
import { UtilityConnection } from './lib/utility/UtilityConnection'
import WebPluginManager from './services/plugin/web/WebPluginManager'
import { ConnectionType } from './lib/db/types'

// 2. Specify a file with the types you want to augment
//    Vue has the constructor type in types/vue.d.ts
declare module 'vue/types/vue' {
  // 3. Declare augmentation for Vue
  interface Vue {
    // ...AppEventMixin.methods,
    $app: BeekeeperPlugin
    $bks: BeekeeperPlugin
    $bksConfig: typeof BksConfig
    $native: NativePlugin
    $util: UtilityConnection
    $plugin: WebPluginManager
    $noty: {
      show(text: string, type: string, opts?: any): void

      success(text: string, opts?: any): Noty
      error(text: string, opts?: any): Noty
      warning(text: string, opts?: any): Noty
      info(text: string, opts?: any): Noty
    }
    $confirm(title?: string, message?: string, options?: { confirmLabel?: string, cancelLabel?: string }): Promise<boolean>
    $confirmById(id: string): Promise<boolean>
    /**
     * Open the connection type picker.
     * @returns the chosen type, or `false` if the user closed the modal.
     */
    $promptConnectionType(): Promise<ConnectionType | false>
    $vHotkeyKeymap: typeof createVHotkeyKeymap
    $CMKeymap: typeof createCodemirrorKeymap

    // TODO: figure out how to add these automatically from AppEvent.ts
    registerHandlers(bindings: RootBinding[]): void
    unregisterHandlers(bindings: RootBinding[]): void
    trigger<T>(event: AppEvent, options: T): void
  }
}
