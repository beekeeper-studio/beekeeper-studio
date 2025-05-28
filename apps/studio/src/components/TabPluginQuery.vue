<template>
  <div class="plugin-query" ref="container" v-hotkey="keymap">
    <div class="top-panel" ref="topPanel">
      <isolated-plugin-view
        :visible="active"
        :plugin-id="tab.context.pluginId"
        :url="url"
        :reload="reload"
      />
    </div>
    <div class="bottom-panel" ref="bottomPanel">
      <result-table
        v-if="showResultTable"
        :focus="focusingElement === 'table'"
        :active="active"
        :table-height="tableHeight"
        :result="result"
        :query="query"
        :tab="tab"
        :binaryEncoding="$bksConfig.ui.general.binaryEncoding"
      />
      <div class="message" v-else-if="result">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <span>
            Query {{ selectedResult + 1 }}/{{ results.length }}: No Results.
            {{ result.affectedRows || 0 }} rows affected. See the select box in
            the bottom left ↙ for more query results.
          </span>
        </div>
      </div>
      <div class="message" v-else-if="errors">
        <error-alert :error="errors" />
      </div>
      <div class="message" v-else-if="info">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <span>{{ info }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Split from "split.js";
import ProgressBar from "@/components/editor/ProgressBar.vue";
import ResultTable from "@/components/editor/ResultTable.vue";
import ShortcutHints from "@/components/editor/ShortcutHints.vue";
import QueryEditorStatusBar from "@/components/editor/QueryEditorStatusBar.vue";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import { PropType } from "vue";
import { TransportPluginQueryTab } from "@/common/transport/TransportOpenTab";
import IsolatedPluginView from "@/components/plugins/IsolatedPluginView.vue";
import Vue from "vue";
import { PluginRequestData } from "@/services/plugin/comm";

export default Vue.extend({
  components: {
    ResultTable,
    ProgressBar,
    ShortcutHints,
    QueryEditorStatusBar,
    ErrorAlert,
    IsolatedPluginView,
  },
  props: {
    tab: {
      type: Object as PropType<TransportPluginQueryTab>,
      required: true,
    },
    active: Boolean,
    reload: null,
  },
  data() {
    return {
      results: [],
      runningCount: 1,
      selectedResult: 0,
      runningQuery: null,
      error: null,
      info: null,
      split: null,
      tableHeight: 0,
      executeTime: 0,
      initialized: false,
      containerResizeObserver: null,
      focusingElement: "table",
      unsubscribePluginRequest: null,
      query: "",
    };
  },
  computed: {
    url() {
      const manifest = this.$plugin.manifestOf(this.tab.context.pluginId);
      const tabType = manifest.capabilities.views.tabTypes.find(
        (t) => t.id === this.tab.context.pluginTabTypeId
      );
      return this.$plugin.buildUrlFor(this.tab.context.pluginId, tabType.entry);
    },
    shouldInitialize() {
      return this.active && !this.initialized;
    },
    errors() {
      return this.error ? [this.error] : null;
    },
    result() {
      return this.results[this.selectedResult];
    },
    rowCount() {
      return this.result && this.result.rows ? this.result.rows.length : 0;
    },
    splitElements() {
      return [this.$refs.topPanel, this.$refs.bottomPanel];
    },
    keymap() {
      if (!this.active) return {};
      return this.$vHotkeyKeymap({
        "queryEditor.switchPaneFocus": this.switchPaneFocus,
      });
    },
    showResultTable() {
      return this.rowCount > 0;
    },
  },
  watch: {
    shouldInitialize() {
      if (this.shouldInitialize) this.initialize();
    },
  },
  methods: {
    initialize() {
      this.initialized = true;

      if (!this.unsubscribePluginRequest) {
        this.unsubscribePluginRequest = this.$plugin.onViewRequest(
          this.tab.context.pluginId,
          async ({ request }: { request: PluginRequestData }) => {
            if (request.name === "expandTableResult") {
              this.results = request.args.results;
              await this.expandTableResult();
            }
          }
        );
      }

      if (this.split) {
        this.split.destroy();
        this.split = null;
      }

      this.split = Split(this.splitElements, {
        minSize: [0, 0],
        elementStyle: (_dimension, elementSize) => ({
          height: `${elementSize}%`,
        }),
        sizes: [100, 0],
        snapOffset: 60,
        gutterSize: 5,
        direction: "vertical",
      });

      // Making sure split.js is initialized
      this.$nextTick(() => {
        this.tableHeight = this.$refs.bottomPanel.clientHeight;
      });
    },
    async switchPaneFocus(
      _event?: KeyboardEvent,
      target?: "text-editor" | "table"
    ) {
      if (target) {
        this.focusingElement = target;
      } else {
        this.focusingElement =
          this.focusingElement === "text-editor" ? "table" : "text-editor";
      }
    },
    async expandTableResult() {
      if (!this.split) return;

      this.split.setSizes([60, 40]);
      await this.$nextTick();
      this.tableHeight = this.$refs.bottomPanel?.clientHeight || 0;
    },
  },
  async mounted() {
    if (this.shouldInitialize) {
      await this.$nextTick();
      this.initialize();
    }

    this.containerResizeObserver = new ResizeObserver(() => {
      this.tableHeight = this.$refs.bottomPanel?.clientHeight || 0;
    });
    this.containerResizeObserver.observe(this.$refs.container);
  },
  beforeDestroy() {
    if (this.split) {
      this.split.destroy();
    }
    this.containerResizeObserver.disconnect();
    this.unsubscribePluginRequest?.();
  },
});
</script>
