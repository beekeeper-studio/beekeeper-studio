<template>
  <div class="advanced-connection-settings">
    <div class="flex flex-middle">
      <span
        v-if="!hideToggle"
        @click.prevent="toggleContent = !toggleContent"
        class="btn btn-link btn-fab"
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
        done();
      };
      el.addEventListener('transitionend', onTransitionEnd);
    },
    beforeLeave(el) {
      el.style.height = el.scrollHeight + 'px';
      el.style.opacity = '1';  // Set initial opacity
    },
    leave(el, done) {
      el.style.height = '0';
      el.style.opacity = '0';  // Fade out

      el.addEventListener('transitionend', done);
    }
    }
  })
</script>
