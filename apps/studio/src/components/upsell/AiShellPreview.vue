<template>
  <div class="cc-preview" ref="root" :class="{ 'cc-reduced-motion': reducedMotion }">
    <div class="cc-preview-body" :class="{ 'is-resetting': resetting }">
      <div
        class="cc-user cc-step cc-step-x"
        :class="{ 'cc-step-show': step >= 1 }"
      >
        What's the most popular movie in my video rental store?
      </div>

      <div class="cc-asst">
        <!-- Always rendered to reserve vertical space, so the caret showing
             doesn't cause a layout jump. -->
        <div class="cc-thinking" aria-hidden="true">
          <span class="cc-caret" v-show="step === 2"></span>
        </div>

        <p
          class="cc-step"
          :class="{ 'cc-step-show': step >= 3 }"
        >
          I'll count rentals per film by joining <code>rental</code> &rarr; <code>inventory</code> &rarr; <code>film</code>.
        </p>

        <div
          class="cc-tool cc-step"
          :class="{ 'cc-step-show': step >= 4 }"
        >
          <span class="cc-tool-bar"></span>
          <span class="cc-tool-name">Get Columns</span>
          <span class="cc-tool-sep">&mdash;</span>
          <span class="cc-tool-meta">rental, 7 columns</span>
        </div>

        <div
          class="cc-tool cc-step"
          :class="{ 'cc-step-show': step >= 5 }"
        >
          <span class="cc-tool-bar"></span>
          <span class="cc-tool-name">Get Columns</span>
          <span class="cc-tool-sep">&mdash;</span>
          <span class="cc-tool-meta">film, 13 columns</span>
        </div>

        <div
          class="cc-runquery cc-step"
          :class="{ 'cc-step-show': step >= 6 }"
        >
          <div class="cc-rq-head">Run Query</div>
          <div
            class="cc-sql cc-sql-reveal"
            :class="{ shown: step >= 7 }"
          ><span class="kw">SELECT</span> f.title, <span class="kw">COUNT</span>(*) <span class="kw">AS</span> rentals
  <span class="kw">FROM</span> <span class="id">rental</span> r
  <span class="kw">JOIN</span> <span class="id">inventory</span> i <span class="kw">ON</span> r.inventory_id = i.inventory_id
  <span class="kw">JOIN</span> <span class="id">film</span> f <span class="kw">ON</span> i.film_id = f.film_id
  <span class="kw">GROUP BY</span> f.title
  <span class="kw">ORDER BY</span> rentals <span class="kw">DESC</span>
  <span class="kw">LIMIT</span> <span class="num">3</span>;</div>
        </div>

        <div
          class="cc-result cc-step"
          :class="{ 'cc-step-show': step >= 8 }"
        >
          <table class="cc-result-table">
            <thead>
              <tr><th>title</th><th>rentals</th></tr>
            </thead>
            <tbody>
              <tr><td>BUCKET BROTHERHOOD</td><td class="num">34</td></tr>
              <tr><td>ROCKETEER MOTHER</td><td class="num">33</td></tr>
              <tr><td>SCALAWAG DUCK</td><td class="num">32</td></tr>
            </tbody>
          </table>
        </div>

        <p
          class="cc-final cc-step"
          :class="{ 'cc-step-show': step >= 9 }"
        >
          <strong>BUCKET BROTHERHOOD</strong> is your most-rented title &mdash; 34 rentals across every copy in inventory.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

// Sequence of timestamps (ms) for each step transition. Index = target step.
// Step meaning:
//   0 = nothing visible
//   1 = user prompt visible
//   2 = "thinking" caret visible
//   3 = assistant intro paragraph visible
//   4 = first Get Columns row visible
//   5 = second Get Columns row visible
//   6 = Run Query header visible
//   7 = SQL block fully revealed (clip-path slide)
//   8 = result row visible (after SQL "runs")
//   9 = assistant final answer visible
const STEP_DELAYS = [400, 1000, 500, 600, 600, 700, 300, 900, 700];
const HOLD_MS = 5000;
const RESET_MS = 350;
const FINAL_STEP = STEP_DELAYS.length;

export default Vue.extend({
  data() {
    return {
      step: 0,
      resetting: false,
      reducedMotion: false,
      timers: [] as number[],
      observer: null as IntersectionObserver | null,
      visible: false,
    };
  },
  mounted() {
    this.reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (this.reducedMotion) {
      this.step = FINAL_STEP;
      return;
    }

    if (typeof IntersectionObserver !== "undefined") {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const wasVisible = this.visible;
          this.visible = entry.intersectionRatio >= 0.4;
          if (this.visible && !wasVisible) {
            this.startLoop();
          } else if (!this.visible && wasVisible) {
            this.stopLoop();
          }
        },
        { threshold: [0, 0.4, 1] }
      );
      this.observer.observe(this.$refs.root as Element);
    } else {
      this.visible = true;
      this.startLoop();
    }
  },
  beforeDestroy() {
    this.stopLoop();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },
  methods: {
    startLoop() {
      this.stopLoop();
      this.step = 0;
      this.resetting = false;
      this.scheduleNext(0);
    },
    stopLoop() {
      for (const t of this.timers) clearTimeout(t);
      this.timers = [];
    },
    scheduleNext(currentStep: number) {
      if (!this.visible) return;
      const next = currentStep + 1;
      if (next > STEP_DELAYS.length) {
        // Hold the final frame, then fade out and restart.
        const t1 = window.setTimeout(() => {
          this.resetting = true;
          const t2 = window.setTimeout(() => {
            this.step = 0;
            this.resetting = false;
            // Small breath before kicking off again.
            const t3 = window.setTimeout(() => this.scheduleNext(0), 250);
            this.timers.push(t3);
          }, RESET_MS);
          this.timers.push(t2);
        }, HOLD_MS);
        this.timers.push(t1);
        return;
      }
      const delay = STEP_DELAYS[currentStep];
      const t = window.setTimeout(() => {
        this.step = next;
        // Step 2 (thinking caret) is transient — it stays until step 3 fires,
        // which happens via the next scheduled timer.
        this.scheduleNext(next);
      }, delay);
      this.timers.push(t);
    },
  },
});
</script>

<style lang="scss" scoped>
@use "sass:color";
@import '../../assets/styles/app/_variables';

// ============================================================================
// Animated mini preview of the SQL AI Shell. Self-contained so it can be
// dropped into any upsell surface — keep the styles here.
// ============================================================================
.cc-preview {
  background: color.adjust($query-editor-bg, $lightness: -3%);
  border: 1px solid $border-color;
  border-radius: 8px;
  margin: 0 0 0.9rem;
  overflow: hidden;
  min-width: 0;
}

.cc-preview-body {
  padding: 0.6rem 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 280px;
  min-width: 0;
  transition: opacity 0.35s ease;

  &.is-resetting {
    opacity: 0;
  }
}

// User bubble — right-aligned, yellow-tinted (matches real AI Shell)
.cc-user {
  align-self: flex-end;
  max-width: 78%;
  background: rgba($theme-primary, 0.10);
  color: $text-dark;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.cc-asst {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;

  p {
    margin: 0;
    color: $text-dark;
    font-size: 0.75rem;
    line-height: 1.45;
    text-transform: none;
    font-weight: 400;
  }

  code {
    background: rgba($theme-base, 0.06);
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.7rem;
  }
}

.cc-thinking {
  height: 0.9rem;
  display: flex;
  align-items: center;
}

.cc-caret {
  display: inline-block;
  width: 0.5rem;
  height: 0.85rem;
  background: linear-gradient(135deg, $brand-pink, $brand-purple);
  border-radius: 1px;
  animation: cc-caret-blink 0.9s steps(2, end) infinite;
}

@keyframes cc-caret-blink {
  0%, 49%   { opacity: 1; }
  50%, 100% { opacity: 0.15; }
}

// Tool call indicator — minimal "Get Columns — 12 columns" row
.cc-tool {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.1rem 0 0.1rem 0.625rem;
  position: relative;
  font-size: 0.72rem;
  color: $text-light;
  align-self: flex-start;
}

.cc-tool-bar {
  position: absolute;
  left: 0;
  top: 0.2rem;
  bottom: 0.2rem;
  width: 2px;
  background: rgba($theme-base, 0.10);
  border-radius: 1px;
}

.cc-tool-name  { color: $text-dark; }
.cc-tool-sep   { color: $text-lighter; }
.cc-tool-meta  { color: $text-light; }

// Run Query block
.cc-runquery {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.15rem;
  min-width: 0;
}

.cc-rq-head {
  font-size: 0.75rem;
  color: $text-dark;
  font-weight: 500;
  text-transform: none;
}

.cc-sql {
  font-family: monospace;
  font-size: 0.7rem;
  line-height: 1.5;
  color: $text-dark;
  background: color.adjust($query-editor-bg, $lightness: -6%);
  border: 1px solid $border-color;
  border-radius: 5px;
  padding: 0.45rem 0.7rem;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;

  .kw  { color: $brand-pink; }
  .id  { color: $brand-secondary; }
  .num { color: $brand-primary; }
  .str { color: $brand-primary; }
}

// Result block (after SQL "runs")
.cc-result {
  margin-top: 0.4rem;
  border: 1px solid $border-color;
  border-radius: 5px;
  background: color.adjust($query-editor-bg, $lightness: -6%);
  overflow: hidden;
  min-width: 0;
}

.cc-result-table {
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
  font-size: 0.7rem;

  th, td {
    padding: 0.35rem 0.7rem;
    text-align: left;
    border-bottom: 1px solid $border-color;
  }

  th {
    color: $text-light;
    font-weight: 500;
    background: rgba($theme-base, 0.02);
    text-transform: none;
    letter-spacing: 0;
  }

  td {
    color: $text-dark;

    &.num { color: $brand-primary; }
  }

  tr:last-child td { border-bottom: 0; }
}

// Final assistant answer — plain text. The real AI shell renders raw text
// without per-word color, so bold emphasis only (no accent color).
.cc-final {
  margin-top: 0.35rem;

  strong {
    color: $text-dark;
    font-weight: 600;
  }
}

// --------------------------------------------------------------------------
// Step transitions (driven by Vue state on AiShellPreview)
// --------------------------------------------------------------------------
.cc-step {
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.35s ease, transform 0.35s ease;
  will-change: opacity, transform;
}

.cc-step-x {
  transform: translateX(14px);
}

.cc-step.cc-step-show {
  opacity: 1;
  transform: translate(0, 0);
}

// SQL "curtain" reveal — clip-path bottom-up
.cc-sql-reveal {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 1.1s cubic-bezier(0.22, 0.61, 0.36, 1);

  &.shown {
    clip-path: inset(0 0 0% 0);
  }
}

// Respect reduced motion: render the final state immediately, no transitions.
.cc-reduced-motion {
  .cc-step,
  .cc-sql-reveal {
    opacity: 1 !important;
    transform: none !important;
    clip-path: none !important;
    transition: none !important;
  }
  .cc-caret { animation: none; opacity: 1; }
  .cc-preview-body.is-resetting { opacity: 1; }
}
</style>
