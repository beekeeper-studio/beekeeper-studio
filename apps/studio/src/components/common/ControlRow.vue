<template>
  <div class="control-row">
    <div class="control-info">
      <span class="control-title">
        {{ title }}
      </span>
      <span class="control-description">
        {{ description }}
      </span>
    </div>
    <div class="control">
      <slot/>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: [ "title", "description" ]
})
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app/_variables';

.control-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-block: 1rem;

  & + & {
    border-top: 1px solid var(--border-subtle);
  }

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }
}

.control-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 auto;
  min-width: 0;
}

.control-title {
  color: var(--text-contrast);
}

.control-description {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
  max-width: 60ch;
}

.control {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

</style>
