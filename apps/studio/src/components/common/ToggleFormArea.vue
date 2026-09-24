<template>
  <div class="advanced-connection-settings" :class="$attrs.class">
    <div class="flex flex-middle">
      <span
        v-if="!hideToggle"
        @click.prevent="toggleContent = !toggleContent"
        class="btn btn-link btn-fab btn-toggle"
      >
        <i class="material-icons">{{ toggleIcon }}</i>
      </span>
      <h4 class="advanced-heading flex">
        <span class="expand">{{ this.title }}</span>
        <slot name="header" />
      </h4>
    </div>
    <transition
      @before-enter="beforeEnter"
      @enter="enter"
      @before-leave="beforeLeave"
      @leave="leave"
    >
      <div
        class="advanced-body"
        v-if="toggleContent"
      >
        <slot />
      </div>
    </transition>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
  export default Vue.extend({
    props: ['expanded', 'title', 'hideToggle', 'initiallyExpanded'],
    mounted() {
      this.toggleContent = !!this.expanded || !!this.initiallyExpanded
    },
    data() {
      return {
        toggleContent: false,
      }
    },
    watch: {
      expanded() {
        this.toggleContent = this.expanded
        this.$emit('expanded', this.expanded)
      }
    },
    computed: {
      toggleIcon() {
        return this.toggleContent ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
      }
    },
    methods: {
      beforeEnter(el) {
      el.style.height = '0';
      el.style.opacity = '0';  // Set initial opacity
      el.style.overflow = 'hidden'; // clip content so it doesn't overlay other elements
    },
    enter(el, done) {
      // get height
      const height = el.scrollHeight + 'px';

      // animate
      el.style.transitionProperty = 'height, opacity';  // Animate both height and opacity
      el.style.transitionDuration = '0.5s';
      el.style.transitionTimingFunction = 'ease-in-out';
      el.style.height = height;
      el.style.opacity = '1';  // Fade in

      // cleanup after animation
      const onTransitionEnd = () => {
        el.removeEventListener('transitionend', onTransitionEnd);
        el.style.height = 'auto';  // Allow natural expansion after animation
        el.style.overflow = '';    // Restore so overflowing children (dropdowns) aren't clipped when open
        done();
      };
      el.addEventListener('transitionend', onTransitionEnd);
    },
    beforeLeave(el) {
      el.style.height = el.scrollHeight + 'px';
      el.style.opacity = '1';  // Set initial opacity
      el.style.overflow = 'hidden'; // clip content so it doesn't overlay other elements
    },
    leave(el, done) {
      // make sure we transition both directions
      el.style.transitionProperty = 'height, opacity';
      el.style.transitionDuration = '0.5s';
      el.style.transitionTimingFunction = 'ease-in-out';
      // Force a reflow so the animation runs from the current height down to 0
      // rather than jumping straight to 0.
      void el.offsetHeight;
      el.style.height = '0';
      el.style.opacity = '0';  // Fade out

      const onTransitionEnd = () => {
        el.removeEventListener('transitionend', onTransitionEnd);
        done();
      };
      el.addEventListener('transitionend', onTransitionEnd);
    }
    }
  })
</script>
