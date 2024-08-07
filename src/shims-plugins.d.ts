import {NativePlugin} from './lib/NativeWrapper'
import Vue from 'vue'
import Noty from 'noty'
import { RootBinding, AppEvent } from './common/AppEvent'
import { BeekeeperPlugin } from './plugins/BeekeeperPlugin'
import { UtilityConnection } from './lib/utility/UtilityConnection'

// 2. Specify a file with the types you want to augment
//    Vue has the constructor type in types/vue.d.ts
declare module 'vue/types/vue' {
  // 3. Declare augmentation for Vue
  interface Vue {
    // ...AppEventMixin.methods,
    $app: BeekeeperPlugin
    $bks: BeekeeperPlugin
    $native: NativePlugin
    $util: UtilityConnection
    $noty: {
      show(text: string, type: string, opts?: any): void

      success(text: string, opts?: any): Noty
      error(text: string, opts?: any): Noty
      warning(text: string, opts?: any): Noty
      info(text: string, opts?: any): Noty
    }
    $confirm(title?: string, message?: string, options?: { confirmLabel?: string, cancelLabel?: string }): Promise<boolean>
    $confirmById(id: string): Promise<boolean>

    // TODO: figure out how to add these automatically from AppEvent.ts
    registerHandlers(bindings: RootBinding[]): void
    unregisterHandlers(bindings: RootBinding[]): void
    trigger<T>(event: AppEvent, options: T): void
  }
}
