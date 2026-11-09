<template>
  <figure
    class="upgrade-testimonials"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <!-- Every quote is stacked in one grid cell so the box is as tall as the
         longest quote and doesn't jump when the visible one changes. -->
    <div
      v-for="(t, i) in testimonials"
      :key="t.name"
      class="upgrade-testimonial"
      :class="{ active: i === index }"
      :aria-hidden="i !== index"
    >
      <blockquote>“{{ t.quote }}”</blockquote>
      <figcaption>
        <span class="author">{{ t.name }}</span>
        <template v-if="t.title">
          <span class="sep">·</span>
          <span class="role">{{ t.title }}</span>
        </template>
      </figcaption>
    </div>
  </figure>
</template>

<script lang="ts">
import Vue from 'vue'
import { TESTIMONIALS } from './testimonials'

const ROTATE_MS = 8000

export default Vue.extend({
  data() {
    return {
      testimonials: TESTIMONIALS,
      // Start somewhere random so the same quote doesn't always lead.
      index: Math.floor(Math.random() * TESTIMONIALS.length),
      paused: false,
      timer: null as ReturnType<typeof setInterval> | null,
    }
  },
  mounted() {
    this.timer = setInterval(() => {
      if (!this.paused) this.index = (this.index + 1) % this.testimonials.length
    }, ROTATE_MS)
  },
  beforeDestroy() {
    if (this.timer) clearInterval(this.timer)
  },
})
</script>
