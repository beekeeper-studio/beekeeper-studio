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
    /** Similar to `window.confirm()` */
    $confirm(title?: string, message?: string, options?: { confirmLabel?: string, cancelLabel?: string }): Promise<boolean>
    /**
     * Use this if you have a custom confirmation modal that you want to show.
     * You can make it by using `<confirmation-modal>` component.
     **/
    $confirmById(id: string): Promise<boolean>
    /** Show a modal and return the form data. The id will be added to the pool in modal manager. */
    $showModal(id: string): Promise<FormData>
    /** Hide a modal and return the form data. The id will be removed from the pool in modal manager. */
    $hideModal(id: string): Promise<FormData>

    // TODO: figure out how to add these automatically from AppEvent.ts
    registerHandlers(bindings: RootBinding[]): void
    unregisterHandlers(bindings: RootBinding[]): void
    trigger<T>(event: AppEvent, options: T): void
  }
}
