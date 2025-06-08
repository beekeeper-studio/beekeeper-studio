<script lang="ts">
import Vue from "vue";
import { PluginNotificationData } from "@beekeeperstudio/plugin";
import { AppEvent } from "@/common/AppEvent";

export default Vue.extend({
  computed: {
    rootBindings() {
      return [
        {
          event: AppEvent.changedTheme,
          handler: this.handleChangedTheme,
        },
      ];
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
