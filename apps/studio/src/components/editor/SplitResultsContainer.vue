<template>
  <div
    class="split-results-container"
    :class="[`orientation-${orientation}`, { 'is-maximized': isMaximized }]"
    ref="container"
  >
    <result-panel
      v-for="(result, index) in results"
      :key="index"
      :ref="`panel-${index}`"
      v-show="isPanelVisible(index)"
      class="split-results-pane"
      :data-pane-index="index"
      :result="result"
      :result-index="index"
      :total-results="results.length"
      :query="query"
      :tab="tab"
      :active="active"
      :focused="focusedIndex === index"
      :binary-encoding="binaryEncoding"
      :can-maximize="results.length > 1"
      :maximized="maximizedIndex === index"
      @toggle-maximize="onToggleMaximize(index)"
      @focus="$emit('focus-panel', index)"
    />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import _ from "lodash";
import Split from "split.js";
import ResultPanel from "./ResultPanel.vue";
import type { QueryResultsSplitOrientation } from "@/common/transport/TransportOpenTab";

type SplitInstance = ReturnType<typeof Split>;

export default Vue.extend({
  name: "SplitResultsContainer",
  components: { ResultPanel },
  props: {
    results: {
      type: Array as PropType<any[]>,
      required: true,
    },
    orientation: {
      type: String as PropType<QueryResultsSplitOrientation>,
      default: "horizontal",
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
    focusedIndex: {
      type: Number,
      default: 0,
    },
    binaryEncoding: {
      type: String,
      default: "hex",
    },
    maximizedIndex: {
      type: Number as PropType<number | null>,
      default: null,
    },
  },
  data() {
    return {
      split: null as SplitInstance | null,
    };
  },
  computed: {
    isMaximized(): boolean {
      return this.maximizedIndex !== null && this.maximizedIndex !== undefined;
    },
    /** Direction passed to split.js. The orientation names are inverted relative
     * to split.js: a "horizontal split" stacks panels (gutter is horizontal) so
     * split.js calls that `vertical` direction. */
    splitDirection(): "horizontal" | "vertical" {
      return this.orientation === "horizontal" ? "vertical" : "horizontal";
    },
  },
  watch: {
    orientation() {
      this.rebuildSplit();
    },
    "results.length"() {
      this.rebuildSplit();
    },
    maximizedIndex() {
      this.rebuildSplit();
    },
  },
  mounted() {
    this.$nextTick(() => this.rebuildSplit());
  },
  beforeDestroy() {
    this.destroySplit();
  },
  methods: {
    isPanelVisible(index: number): boolean {
      if (!this.isMaximized) return true;
      return this.maximizedIndex === index;
    },
    visiblePanelElements(): HTMLElement[] {
      const elements: HTMLElement[] = [];
      for (let i = 0; i < this.results.length; i++) {
        if (!this.isPanelVisible(i)) continue;
        const refs = this.$refs[`panel-${i}`] as Vue[] | undefined;
        const refInstance = Array.isArray(refs) ? refs[0] : refs;
        const el = refInstance?.$el as HTMLElement | undefined;
        if (el) elements.push(el);
      }
      return elements;
    },
    destroySplit() {
      if (this.split) {
        try {
          this.split.destroy();
        } catch (e) {
          // split.js can throw on destroy if elements were already removed
        }
        this.split = null;
      }
    },
    rebuildSplit() {
      this.$nextTick(() => {
        this.destroySplit();
        const elements = this.visiblePanelElements();

        // Reset any flex-basis left over from a previous split.js instance.
        for (let i = 0; i < this.results.length; i++) {
          const refs = this.$refs[`panel-${i}`] as Vue[] | undefined;
          const refInstance = Array.isArray(refs) ? refs[0] : refs;
          const el = refInstance?.$el as HTMLElement | undefined;
          if (el) el.style.flexBasis = "";
        }

        if (elements.length < 2) return;

        const sizes = elements.map(() => 100 / elements.length);
        this.split = Split(elements, {
          sizes,
          direction: this.splitDirection,
          gutterSize: 6,
          minSize: 80,
          elementStyle: (_dimension, size) => ({
            "flex-basis": `calc(${size}%)`,
          }),
          onDragEnd: _.debounce(() => {
            this.$emit("panels-resized");
          }, 50),
        });
      });
    },
    onToggleMaximize(index: number) {
      const next = this.maximizedIndex === index ? null : index;
      this.$emit("toggle-maximize", next);
    },
    /** Programmatically focus a particular panel's table. */
    focusPanel(index: number) {
      const refs = this.$refs[`panel-${index}`] as Vue[] | undefined;
      const refInstance = Array.isArray(refs) ? refs[0] : refs;
      (refInstance as any)?.focusTable?.();
    },
  },
});
</script>
