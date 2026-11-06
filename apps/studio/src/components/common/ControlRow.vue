<template>
  <component
    :is="fieldset ? 'fieldset' : 'div'"
    class="form-group control-row"
    :class="[`direction-${direction}`, { highlighted }]"
    :role="fieldset ? null : 'group'"
    :aria-labelledby="titleId"
    :aria-describedby="description ? descriptionId : null"
  >
    <div class="control-info">
      <span :id="titleId" class="control-title">
        {{ title }}
      </span>
      <span v-if="description" :id="descriptionId" class="control-description">
        {{ description }}
      </span>
    </div>
    <div class="control">
      <slot/>
    </div>
  </component>
</template>

<script lang="ts">
import Vue, { PropType } from "vue"
import _ from "lodash"

export default Vue.extend({
  props: {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    /** Render as a `<fieldset>` with a `<legend>`. Enable this if you make multiple inputs. */
    fieldset: Boolean,
    /** Briefly flash the background to draw attention to this row. */
    highlighted: Boolean,
    /**
     * Main axis for the title and slot content, like CSS `flex-direction`:
     * `row` puts the content beside the title, `column` puts it below.
     */
    direction: {
      type: String as PropType<"row" | "column">,
      default: "row",
    },
  },
  computed: {
    rowId(): string {
      return _.uniqueId("control-row-");
    },
    titleId(): string {
      return `${this.rowId}-title`;
    },
    descriptionId(): string {
      return `${this.rowId}-description`;
    },
  },
});
</script>

<style lang="scss" scoped>
.control-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;
  min-width: 0;
  padding: 0;
  border: 0;

  &.direction-column {
    flex-direction: column;
    align-items: stretch;
    gap: 0;

    .control {
      display: block;
      min-width: 0;
    }
  }

  &.highlighted {
    animation: control-row-highlight 2s ease-out;
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

@keyframes control-row-highlight {
  from {
    background-color: var(--primary-bg-hover-a);
  }

  to {
    background-color: transparent;
  }
}
</style>
