<template>
  <div class="plugin-shell" ref="container" v-hotkey="keymap">
    <div class="top-panel" ref="topPanel">
      <PluginViewGate
        :plugin-id="tab.context.pluginId"
        :view-id="tab.context.pluginTabTypeId"
        v-slot="{ data }"
      >
        <isolated-plugin-view
          :visible="active"
          :plugin-id="tab.context.pluginId"
          :url="data.url"
          :reload="reload"
          :on-request="handleRequest"
          :command="tab.context.command"
          :params="tab.context.params"
        />
      </PluginViewGate>
    </div>
    <div class="bottom-panel" ref="bottomPanel" :class="{ 'hidden-panel': !isTablePanelVisible }">
      <result-table
        ref="table"
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
      <div class="message empty" v-else>
        Results will appear here
      </div>
    </div>
    <query-editor-status-bar
      v-if="showStatusBarUI"
      v-model="selectedResult"
      :results="results"
      :running="isRunningQuery"
      :execute-time="executeTime"
      :active="active"
      @download="download"
      @clipboard="clipboard"
      @clipboardJson="clipboardJson"
      @clipboardMarkdown="clipboardMarkdown"
    >
      <template #left-actions>
        <x-button
          class="btn btn-flat btn-icon"
          @click="toggleTablePanel"
        >
          <i class="material-icons">{{ isTablePanelVisible ? 'remove' : 'table_view' }}</i>
          {{ isTablePanelVisible ? 'Hide result' : 'Show result' }}
        </x-button>
      </template>
    </query-editor-status-bar>
  </div>
</template>

<script lang="ts">
import Split from "split.js";
import ProgressBar from "@/components/editor/ProgressBar.vue";
import ResultTable from "@/components/editor/ResultTable.vue";
import ShortcutHints from "@/components/editor/ShortcutHints.vue";
import QueryEditorStatusBar from "@/components/editor/QueryEditorStatusBar.vue";
import { PropType } from "vue";
import { TransportPluginTab } from "@/common/transport/TransportOpenTab";
import IsolatedPluginView from "@/components/plugins/IsolatedPluginView.vue";
import Vue from "vue";
import { RunQueryResponse } from "@beekeeperstudio/plugin"
import type { OnViewRequestListenerParams } from "@/services/plugin/types";
import PluginViewGate from "./plugins/PluginViewGate.vue";

export default Vue.extend({
  components: {
    ResultTable,
    ProgressBar,
    ShortcutHints,
    QueryEditorStatusBar,
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
  data() {
    return {
      results: [],
      runningCount: 1,
      selectedResult: 0,
      isRunningQuery: null,
      error: null,
      info: null,
      split: null,
      tableHeight: 0,
      executeTime: 0,
      initialized: false,
      containerResizeObserver: null,
      focusingElement: "table",
      query: "",
      isTablePanelVisible: false,
      showStatusBarUI: true,
    };
  },
  computed: {
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
    async shouldInitialize() {
      if (this.shouldInitialize) {
        await this.$nextTick();
        this.initialize();
      }
    },
  },
  methods: {
    initialize() {
      this.initialized = true;

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
        onDrag: ([topPanelSize, bottomPanelSize]) => {
          // Define a threshold to detect if bottom panel is effectively visible
          const VISIBLE_THRESHOLD = 5; // 5% minimum to consider panel visible
          this.isTablePanelVisible = bottomPanelSize > VISIBLE_THRESHOLD;
        },
      });

      // Initialize table panel as collapsed
      this.isTablePanelVisible = false;

      // Making sure split.js is initialized
      this.$nextTick(() => {
        this.tableHeight = this.$refs.bottomPanel.clientHeight;
      });

      if (this.containerResizeObserver) {
        this.containerResizeObserver.disconnect();
      }
      this.containerResizeObserver = new ResizeObserver(() => {
        this.tableHeight = this.$refs.bottomPanel?.clientHeight || 0;
      });
      this.containerResizeObserver.observe(this.$refs.container);
    },
    download(format) {
      this.$refs.table.download(format)
    },
    clipboard() {
      this.$refs.table.clipboard()
    },
    clipboardJson() {
      // eslint-disable-next-line
      // @ts-ignore
      const data = this.$refs.table.clipboard('json')
    },
    clipboardMarkdown() {
      // eslint-disable-next-line
      // @ts-ignore
      const data = this.$refs.table.clipboard('md')
    },
    async handleRequest({ request, modifyResult, after }: OnViewRequestListenerParams) {

      switch (request.name) {
        case "runQuery": {
          const queryStartTime = new Date()

          this.isRunningQuery = true;

          after((response) => {
            const queryEndTime = new Date()
            const result = response.result as RunQueryResponse
            if (request.name === "runQuery") {
              this.isRunningQuery = false;
              this.executeTime = queryEndTime - queryStartTime;
              this.results = result.results ?? [];
            }
          })

          break;
        }
        case "expandTableResult": {
          await this.expandTableResult();
          this.results = request.args.results;
          break;
        }
        case "setTabTitle": {
          if (!request.args.title) {
            throw new Error("Tab title is required");
          }
          this.tab.title = request.args.title;
          await this.$store.dispatch('tabs/save', this.tab)
          break;
        }
        case "getViewState": {
          modifyResult(() => this.tab.context.state)
          break;
        }
        case "setViewState": {
          this.tab.context.state = request.args.state;
          await this.$store.dispatch('tabs/save', this.tab)
          break;
        }
        case "toggleStatusBarUI": {
          if (typeof request.args?.force === "boolean") {
            this.showStatusBarUI = request.args.force;
          } else {
            this.showStatusBarUI = !this.showStatusBarUI;
          }
          break;
        }
      }
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
      this.isTablePanelVisible = true;
      await this.$nextTick();
      this.tableHeight = this.$refs.bottomPanel?.clientHeight || 0;
    },
    async collapseTableResult() {
      if (!this.split) return;

      this.split.setSizes([100, 0]);
      this.isTablePanelVisible = false;
      await this.$nextTick();
      this.tableHeight = this.$refs.bottomPanel?.clientHeight || 0;
    },
    async toggleTablePanel() {
      if (this.isTablePanelVisible) {
        await this.collapseTableResult();
      } else {
        await this.expandTableResult();
      }
    },
  },
  async mounted() {
    if (this.shouldInitialize) {
      await this.$nextTick();
      this.initialize();
    }
  },
  beforeDestroy() {
    if (this.split) {
      this.split.destroy();
    }
    this.containerResizeObserver?.disconnect();
  },
});
</script>
