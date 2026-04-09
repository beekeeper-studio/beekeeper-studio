import { BksConfigProvider } from '@/common/bksConfig/BksConfigProvider'
import { ConfigMetadataProvider } from '@/common/bksConfig/ConfigMetadataProvider'
import { SettingsPlugin } from '@/plugins/SettingsPlugin'
import { type WebPluginManager } from '@/services/plugin/web'

declare module 'vue/types/vue' {
  interface Vue {
    $plugin: WebPluginManager
    $bksPlugin: WebPluginManager
    $bksConfig: BksConfigProvider
    $bksConfigUI: ConfigMetadataProvider
    $settings: typeof SettingsPlugin
  }
}
