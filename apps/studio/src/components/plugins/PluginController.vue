<script lang="ts">
import Vue from "vue";
import { PluginNotificationData } from "@beekeeperstudio/plugin";
import { AppEvent } from "@/common/AppEvent";
import { NativePluginMenuItem } from "@/services/plugin";

export default Vue.extend({
  props: {
    editorFontSize: Number,
  },
  computed: {
    rootBindings() {
      return [
        {
          event: AppEvent.changedTheme,
          handler: this.handleChangedTheme,
        },
        {
          event: AppEvent.pluginMenuClicked,
          handler: this.handlePluginMenuClicked,
        },
      ];
    },
  },
  watch: {
    editorFontSize() {
      this.$plugin.notifyAll({
        name: "editorFontSizeChanged",
        args: { value: this.editorFontSize },
      });
    },
  },
  methods: {
    handleChangedTheme(themeValue: string) {
      const data: PluginNotificationData = {
        name: "themeChanged",
        args: this.$plugin.pluginStore.getTheme(),
      };
      this.$plugin.notifyAll(data);
    },
    handlePluginMenuClicked(item: NativePluginMenuItem) {
      this.$plugin.execute(item.pluginId, item.command);
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  render() {
    return null;
  },
});
</script>
