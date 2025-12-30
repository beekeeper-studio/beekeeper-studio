import { BksConfigProvider } from '@/common/bksConfig/BksConfigProvider'
import { SettingsPlugin } from '@/plugins/SettingsPlugin'
import { type WebPluginManager } from '@/services/plugin/web'

declare module 'vue/types/vue' {
  interface Vue {
    $plugin: WebPluginManager
    $bksPlugin: WebPluginManager
    $bksConfig: BksConfigProvider
    $settings: typeof SettingsPlugin
  }
}
