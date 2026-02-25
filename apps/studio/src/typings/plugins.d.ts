import { BksConfigProvider } from '@/common/bksConfig/BksConfigProvider'
import { ConfigMetadataProvider } from '@/common/bksConfig/ConfigMetadataProvider'
import { SettingsPlugin } from '@/plugins/SettingsPlugin'

declare module 'vue/types/vue' {
  interface Vue {
    $bksPlugin: WebPluginManager
    $bksConfig: BksConfigProvider
    $bksConfigUI: ConfigMetadataProvider
    $settings: typeof SettingsPlugin
  }
}
