<template>
  <div
    v-if="isCommunity && tab.context.pluginId.startsWith('bks-')"
    class="tab-upsell-wrapper"
    :class="{ 'tab-upsell-wrapper--erd': isErDiagramPlugin }"
  >
    <erd-upsell v-if="isErDiagramPlugin" />
    <upsell-content v-else />
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
import UpsellContent from "@/components/upsell/UpsellContent.vue";
import ErdUpsell from "@/components/upsell/ErdUpsell.vue";
import { OnViewRequestListenerParams } from "@/services/plugin/types";
import rawLog from "@bksLogger";

const log = rawLog.scope("TabPluginBase");

export default Vue.extend({
  components: {
    IsolatedPluginView,
    UpsellContent,
    ErdUpsell,
  },

  props: {
    tab: {
      type: Object as PropType<TransportPluginTab>,
      required: true,
    },
    active: Boolean,
  },

  computed: {
    ...mapGetters(["isCommunity"]),
    isErDiagramPlugin(): boolean {
      return this.tab.context.pluginId === "bks-er-diagram";
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
