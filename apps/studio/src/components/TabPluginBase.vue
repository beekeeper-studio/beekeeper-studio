<template>
  <div v-if="isCommunity && tab.context.pluginId.startsWith('bks-')" class="tab-upsell-wrapper">
    <upsell-content />
  </div>
  <div v-else-if="isUnsupportedErDiagram" class="plugin-base plugin-unsupported">
    <div class="unsupported-message">
      <div class="card-flat padding">
        <h3 class="card-title">
          Entity Relationship Diagrams are not available for {{ dialectTitle }}
        </h3>
        <p class="card-subtitle">
          {{ dialectTitle }} does not support foreign key relationships, which are required for generating ER diagrams.
        </p>
      </div>
    </div>
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
import { OnViewRequestListenerParams } from "@/services/plugin/types";
import { DialectTitles } from "@shared/lib/dialects/models";
import rawLog from "@bksLogger";

const log = rawLog.scope("TabPluginBase");

export default Vue.extend({
  components: {
    IsolatedPluginView,
    UpsellContent,
  },

  props: {
    tab: {
      type: Object as PropType<TransportPluginTab>,
      required: true,
    },
    active: Boolean,
  },

  computed: {
    ...mapGetters(["isCommunity", "dialectData", "dialect"]),
    isUnsupportedErDiagram(): boolean {
      // Check if this is the ERD plugin and if the current dialect doesn't support relations/ERD
      if (this.tab.context.pluginId !== 'bks-er-diagram') {
        return false;
      }
      return !!this.dialectData?.disabledFeatures?.erd ||
             !!this.dialectData?.disabledFeatures?.relations;
    },
    dialectTitle(): string {
      return DialectTitles[this.dialect] || this.dialect;
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

<style scoped>
.plugin-unsupported {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.unsupported-message {
  text-align: center;
  max-width: 500px;
}

.unsupported-message .card-subtitle {
  margin-top: 0.5rem;
  opacity: 0.8;
}
</style>
