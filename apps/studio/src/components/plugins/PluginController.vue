<script lang="ts">
import Vue from "vue";
import { PluginNotificationData } from "@beekeeperstudio/plugin";
import { AppEvent } from "@/common/AppEvent";
import { mapState } from "vuex";
import type { TierChange } from "@/store/modules/LicenseModule";
import globals from "@/common/globals";
import Noty from "noty";

export default Vue.extend({
  computed: {
    ...mapState('licenses', ["tierChange"]),
    rootBindings() {
      return [
        {
          event: AppEvent.changedTheme,
          handler: this.handleChangedTheme,
        },
      ];
    },
  },
  watch: {
    tierChange: {
      handler() {
        const tier: TierChange = this.tierChange;
        if (tier.hasChanged && tier.direction === "downgrade") {
          let message = '';

          if (tier.to === 'indie') {
            message = `Your license has changed. You are now limited to ${globals.maxPluginsForIndie} plugins.`;
          } else if (tier.to === 'free') {
            message = `Your license has changed. You are now limited to ${globals.maxCommunityPluginsForFree} community plugins.`;
          }

          if (message) {
            new Noty({
              text: message,
              timeout: 1000 * 60 * 5,
              queue: "upsell",
              killer: 'upsell',
              layout: 'bottomRight',
              closeWith: ['button'],
              buttons: [
                Noty.button('Close', 'btn btn-flat', () => Noty.closeAll('upsell')),
                Noty.button('Learn more', 'btn btn-primary', () => window.main.openExternally('https://beekeeperstudio.io/pricing/'))
              ]
            }).show();
          }
        }
      },
      immediate: true,
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
