import { BksConfigProvider } from '@/common/bksConfig/BksConfigProvider'
import { SettingsPlugin } from '@/plugins/SettingsPlugin'

declare module 'vue/types/vue' {
  interface Vue {
    $bksPlugin: WebPluginManager
    $bksConfig: BksConfigProvider
    $settings: typeof SettingsPlugin
  }
}
