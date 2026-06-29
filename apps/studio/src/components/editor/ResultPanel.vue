<template>
  <div
    class="result-panel"
    :class="{
      'has-header': showHeader,
      'is-maximized': maximized,
      'is-focused': focused,
    }"
  >
    <div
      v-if="showHeader"
      class="result-panel-header"
      @mousedown="$emit('focus')"
    >
      <span class="result-panel-label">
        Result {{ resultIndex + 1 }}<span
          v-if="totalResults > 1"
          class="result-panel-label-total"
        >/{{ totalResults }}</span>
      </span>
      <span class="result-panel-meta">
        <template v-if="hasRows">
          <i class="material-icons">list_alt</i>
          <span>{{ rowCount }} {{ pluralize('row', rowCount, false) }}</span>
          <span
            v-if="result.truncated"
            class="truncated-rows"
            v-tooltip="'Truncated — use Download to get the full resultset'"
          >/&nbsp;{{ result.totalRowCount }}</span>
        </template>
        <template v-else>
          <i class="material-icons">info</i>
          <span>No rows · {{ result.affectedRows || 0 }} affected</span>
        </template>
      </span>
      <span class="expand" />
      <button
        v-if="canMaximize"
        type="button"
        class="btn btn-flat btn-icon result-panel-maximize"
        :title="maximized ? 'Restore split view' : 'Maximize this result'"
        @click="$emit('toggle-maximize')"
      >
        <i class="material-icons">{{
          maximized ? 'close_fullscreen' : 'open_in_full'
        }}</i>
      </button>
    </div>
    <div
      class="result-panel-body"
      ref="body"
    >
      <result-table
        v-if="hasRows"
        ref="resultTable"
        :result="result"
        :table-height="bodyHeight"
        :query="query"
        :active="active"
        :tab="tab"
        :focus="focused"
        :binary-encoding="binaryEncoding"
      />
      <div
        v-else
        class="message"
      >
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <span>No Results. {{ result.affectedRows || 0 }} rows affected.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import _ from 'lodash';
import ResultTable from './ResultTable.vue';

export default Vue.extend({
  name: 'ResultPanel',
  components: { ResultTable },
  props: {
    result: {
      type: Object,
      required: true,
    },
    resultIndex: {
      type: Number,
      required: true,
    },
    totalResults: {
      type: Number,
      required: true,
    },
    query: {
      type: Object as PropType<any>,
      default: null,
    },
    tab: {
      type: Object as PropType<any>,
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
    focused: {
      type: Boolean,
      default: false,
    },
    binaryEncoding: {
      type: String,
      default: 'hex',
    },
    showHeader: {
      type: Boolean,
      default: true,
    },
    canMaximize: {
      type: Boolean,
      default: true,
    },
    maximized: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      bodyHeight: 0,
      resizeObserver: null as ResizeObserver | null,
    };
  },
  computed: {
    hasRows(): boolean {
      return !!this.result?.rows?.length;
    },
    rowCount(): number {
      return this.result?.rows?.length || 0;
    },
  },
  mounted() {
    this.measure();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(
        _.throttle(() => this.measure(), 100, { trailing: true })
      );
      this.resizeObserver.observe(this.$refs.body as Element);
    }
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  },
  methods: {
    measure() {
      const el = this.$refs.body as HTMLElement | undefined;
      if (!el) return;
      this.bodyHeight = el.clientHeight;
    },
    pluralize(word: string, amount: number, flag: boolean): string {
      return (window as any).main.pluralize(word, amount, flag);
    },
    /** Forwards focus into the underlying tabulator instance. */
    focusTable() {
      const rt = this.$refs.resultTable as any;
      rt?.triggerFocus?.();
    },
  },
});
</script>
