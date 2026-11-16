<template>
  <div v-if="isCommunity && tab.context.pluginId.startsWith('bks-')" class="upgrade-panel-tab-wrapper">
    <upgrade-panel :feature-name="tab.title || 'Plugins'" standalone />
  </div>
  <div v-else class="plugin-base" ref="container">
    <isolated-plugin-view
      :visible="active"
      :plugin-id="tab.context.pluginId"
      :view-id="tab.context.pluginTabTypeId"
      :on-request="handleRequest"
      :command="tab.context.command"
      :params="tab.context.params"
    />
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { TransportPluginTab } from "@/common/transport/TransportOpenTab";
import IsolatedPluginView from "@/components/plugins/IsolatedPluginView.vue";
import Vue from "vue";
import { mapGetters } from "vuex";
import UpgradePanel from "@/components/upsell/UpgradePanel.vue";
import { OnViewRequestListenerParams } from "@/services/plugin/types";
import rawLog from "@bksLogger";
import { paidFeatureForPlugin, recordPaidFeatureUse } from "@/lib/paidFeatures";

const log = rawLog.scope("TabPluginBase");

export default Vue.extend({
  components: {
    IsolatedPluginView,
    UpgradePanel,
  },

  props: {
    tab: {
      type: Object as PropType<TransportPluginTab>,
      required: true,
    },
    active: Boolean,
  },

  data() {
    return {
      usageRecorded: false,
    };
  },

  computed: {
    ...mapGetters(["isCommunity"]),
  },

  watch: {
    active: {
      immediate: true,
      handler(active: boolean) {
        // A paid plugin (ER diagrams) counts as used the first time its tab is
        // actually shown, not when it is merely restored in the background.
        if (!active || this.isCommunity || this.usageRecorded) return;
        const paidFeature = paidFeatureForPlugin(this.tab.context.pluginId);
        if (!paidFeature) return;
        recordPaidFeatureUse(paidFeature);
        this.usageRecorded = true;
      },
    },
  },

  methods: {
    async handleRequest({
      request,
      modifyResult,
    }: OnViewRequestListenerParams) {
      switch (request.name) {
        case "setTabTitle": {
          if (!request.args.title) {
            throw new Error("Tab title is required");
          }
          this.tab.title = request.args.title;
          await this.$store.dispatch("tabs/save", this.tab);
          break;
        }
        case "getViewState": {
          modifyResult(() => this.tab.context.state);
          break;
        }
        case "setViewState": {
          this.tab.context.state = request.args.state;
          await this.$store.dispatch("tabs/save", this.tab);
          break;
        }
      }
    },
  },
});
</script>
