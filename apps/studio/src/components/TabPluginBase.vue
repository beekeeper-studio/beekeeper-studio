<template>
  <plugin-view-gate
    :plugin-id="tab.context.pluginId"
    :view-id="tab.context.pluginTabTypeId"
    v-slot="{ data }"
  >
    <div class="plugin-base" ref="container">
      <isolated-plugin-view
        :visible="active"
        :plugin-id="tab.context.pluginId"
        :url="data.url"
        :reload="reload"
        :on-request="handleRequest"
        :command="tab.context.command"
        :params="tab.context.params"
      />
    </div>
  </plugin-view-gate>
</template>

<script lang="ts">
import { PropType } from "vue";
import { TransportPluginTab } from "@/common/transport/TransportOpenTab";
import IsolatedPluginView from "@/components/plugins/IsolatedPluginView.vue";
import Vue from "vue";
import { OnViewRequestListenerParams } from "@/services/plugin/types";
import PluginViewGate from "./plugins/PluginViewGate.vue";

export default Vue.extend({
  components: {
    IsolatedPluginView,
    PluginViewGate,
  },

  props: {
    tab: {
      type: Object as PropType<TransportPluginTab>,
      required: true,
    },
    active: Boolean,
    reload: null,
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
