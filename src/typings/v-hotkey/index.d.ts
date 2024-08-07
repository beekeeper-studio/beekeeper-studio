declare module 'v-hotkey' {
  import { PluginObject } from "vue";

  // options: alias map
  const VueHotkey: PluginObject<Map<string, number>>;
  export default VueHotkey;
}
