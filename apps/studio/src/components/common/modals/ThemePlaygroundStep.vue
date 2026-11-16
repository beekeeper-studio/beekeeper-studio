<template>
  <div class="playground-step">
    <h4>{{ stepperProps.title }}</h4>
    <p class="text-muted">
      {{ stepperProps.description }}
    </p>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: {
    stepperProps: {
      type: Object,
      required: true,
    },
  },
  methods: {
    canContinue() {
      return true;
    },
  },
});
</script>

<style lang="scss" scoped>
.playground-step {
  padding: 1rem;
}
</style>
