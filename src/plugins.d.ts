import ElectronPlugin from './lib/NativeWrapper'
import Vue from 'vue'
import { RootBinding, AppEvent } from './common/AppEvent'

// 2. Specify a file with the types you want to augment
//    Vue has the constructor type in types/vue.d.ts
declare module 'vue/types/vue' {
  // 3. Declare augmentation for Vue
  interface Vue {
    // ...AppEventMixin.methods,
    $native: ElectronPlugin
    $noty: {
      show(text: string, type: string, opts?: any): void

      success(text: string, opts?: any): void
      error(text: string, opts?: any): void
      warning(text: string, opts?: any): void
      info(text: string, opts?: any): void
    }

    // TODO: figure out how to add these automatically from AppEvent.ts
    registerHandlers(bindings: RootBinding[]): void
    unregisterHandlers(bindings: RootBinding[]): void
    trigger<T>(event: AppEvent, options: T): void

  }
}