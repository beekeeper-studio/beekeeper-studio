<script lang="ts">
import Vue from "vue";
import { PluginNotificationData } from "@beekeeperstudio/plugin";
import { AppEvent } from "@/common/AppEvent";
import { NativePluginMenuItem } from "@/services/plugin";

export default Vue.extend({
  props: {
    editorFontSize: Number,
  },
  data() {
    return {
      darkMedia: null,
    };
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
    handleChangedTheme() {
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
    this.darkMedia = window.matchMedia("(prefers-color-scheme: dark)");
    this.darkMedia.addEventListener("change", this.handleChangedTheme);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    this.darkMedia?.removeEventListener("change", this.handleChangedTheme);
  },
  render() {
    return null;
  },
});
</script>
