import Vue from 'vue';
import { convertKeybinding } from '@/common/bksConfig/BksConfigProvider'

export function UiKeybind(shortcut:string|string[]): string[] {
  const platform = window.platformInfo.platform
  return convertKeybinding('ui', Array.isArray(shortcut) ? shortcut[0] : shortcut, platform)
}

export default {
  install(Vue) {
    Vue.prototype.$getUiKeybind = UiKeybind
  }
}
