<template>
  <component
    :is="fieldset ? 'fieldset' : 'div'"
    class="form-group config-item"
    :class="[`direction-${direction}`, { highlighted }]"
  >
    <component :is="fieldset ? 'legend' : 'label'">
      {{ label }}
    </component>
    <p
      v-if="helper"
      class="helper"
    >
      {{ helper }}
    </p>
    <div class="input-wrapper">
      <slot />
    </div>
  </component>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";

export default Vue.extend({
  props: {
    label: {
      type: String,
      required: true,
    },
    helper: {
      type: String,
      default: "",
    },
    fieldset: Boolean,
    highlighted: Boolean,
    // "column" puts the control under the label instead of beside it
    direction: {
      type: String as PropType<"row" | "column">,
      default: "row",
    },
  },
});
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/app/_variables';

.config-item {
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: 1fr auto;
  column-gap: 1rem;
  min-width: 0;
  border: 0;

  label,
  legend {
    padding-left: 0;
  }

  // A non-floated legend renders in the fieldset border, above the padding
  legend {
    float: left;
    width: 100%;
    font-size: $form-control-font-size;
    line-height: 1.5;
    margin-bottom: 2px;
  }

  .helper {
    grid-column: 1;
    margin: 0;
    font-size: $form-control-font-size;
    color: var(--text-muted);
  }

  .input-wrapper {
    grid-column: 2;
    grid-row: 1 / span 2;
    display: flex;
    align-items: center;
  }

  &.direction-column {
    grid-template-columns: 1fr;

    .input-wrapper {
      grid-column: 1;
      grid-row: auto;
      display: block;
      min-width: 0;
    }
  }

  &.highlighted {
    animation: config-item-highlight 2s ease-out;
  }
}

@keyframes config-item-highlight {
  from {
    background-color: var(--primary-bg-hover-a);
  }

  to {
    background-color: transparent;
  }
}
</style>
