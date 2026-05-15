<template>
  <div class="carousel">
    <div class="carousel-viewport">
      <button
        v-if="slideCount > 1"
        type="button"
        class="btn btn-fab carousel-chevron carousel-chevron-left"
        aria-label="Previous slide"
        @click="prev"
      >
        <i class="material-icons">chevron_left</i>
      </button>
      <div class="carousel-track-container">
        <div
          class="carousel-track"
          :style="{ transform: `translateX(-${activeIndex * 100}%)` }"
        >
          <slot />
        </div>
      </div>
      <button
        v-if="slideCount > 1"
        type="button"
        class="btn btn-fab carousel-chevron carousel-chevron-right"
        aria-label="Next slide"
        @click="next"
      >
        <i class="material-icons">chevron_right</i>
      </button>
    </div>
    <div v-if="slideCount > 1" class="carousel-dots" role="tablist">
      <button
        v-for="i in slideCount"
        :key="i"
        type="button"
        class="carousel-dot"
        :class="{ active: i - 1 === activeIndex }"
        :aria-label="`Go to slide ${i}`"
        :aria-selected="i - 1 === activeIndex"
        @click="goTo(i - 1)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "Carousel",
  props: {
    autoScroll: { type: Boolean, default: true },
    intervalMs: { type: Number, default: 4000 },
  },
  data() {
    return {
      activeIndex: 0,
      slideCount: 0,
      autoScrollTimer: null as ReturnType<typeof setInterval> | null,
    };
  },
  provide(): Record<string, unknown> {
    return {
      registerSlide: this.registerSlide,
      unregisterSlide: this.unregisterSlide,
    };
  },
  methods: {
    registerSlide() {
      this.slideCount += 1;
    },
    unregisterSlide() {
      this.slideCount = Math.max(0, this.slideCount - 1);
      if (this.activeIndex >= this.slideCount) {
        this.activeIndex = Math.max(0, this.slideCount - 1);
      }
    },
    prev() {
      if (this.slideCount === 0) return;
      this.activeIndex =
        (this.activeIndex - 1 + this.slideCount) % this.slideCount;
      this.restartAutoScroll();
    },
    next() {
      if (this.slideCount === 0) return;
      this.activeIndex = (this.activeIndex + 1) % this.slideCount;
      this.restartAutoScroll();
    },
    goTo(i: number) {
      this.activeIndex = i;
      this.restartAutoScroll();
    },
    startAutoScroll() {
      this.stopAutoScroll();
      if (!this.autoScroll) return;
      this.autoScrollTimer = setInterval(() => {
        if (this.slideCount === 0) return;
        this.activeIndex = (this.activeIndex + 1) % this.slideCount;
      }, this.intervalMs);
    },
    stopAutoScroll() {
      if (this.autoScrollTimer) {
        clearInterval(this.autoScrollTimer);
        this.autoScrollTimer = null;
      }
    },
    restartAutoScroll() {
      if (this.autoScrollTimer) this.startAutoScroll();
    },
  },
  watch: {
    autoScroll(val: boolean) {
      if (val) {
        this.startAutoScroll();
      } else {
        this.stopAutoScroll();
      }
    },
  },
  mounted() {
    this.startAutoScroll();
  },
  beforeDestroy() {
    this.stopAutoScroll();
  },
});
</script>

<style scoped>
.carousel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.carousel-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.carousel-track-container {
  flex-grow: 1;
  overflow: hidden;
}

.carousel-track {
  display: flex;
  width: 100%;
  transition: transform 0.4s ease;
  will-change: transform;
}

.carousel-chevron {
  background-color: transparent;
}

.carousel-dots {
  display: flex;
  gap: 8px;
}

.carousel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: var(--border-color);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--text-light);
  }

  &.active {
    background: var(--theme-primary);
  }
}
</style>
