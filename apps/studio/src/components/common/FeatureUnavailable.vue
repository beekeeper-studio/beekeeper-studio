<template>
  <div class="feature-unavailable" role="status">
    <i class="material-icons" aria-hidden="true">info_outline</i>
    <p>{{ featureName }} is unavailable in this edition.</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  props: {
    featureName: {
      type: String,
      default: 'This feature',
    },
  },
});
</script>

<style lang="scss">
.feature-unavailable-wrapper {
  height: 100%;
  overflow: auto;
  padding: 24px;
}

.feature-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-light);

  p {
    margin: 0;
  }
}
</style>
