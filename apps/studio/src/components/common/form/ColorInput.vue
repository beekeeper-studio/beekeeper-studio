<template>
  <span class="color-input">
    <span class="field-input">
      <input
        class="swatch"
        :value="value"
        @input="emit($event.target.value)"
        type="color"
      >
      <input
        :id="id"
        :value="value"
        @change="emit($event.target.value)"
        type="text"
        spellcheck="false"
      >
    </span>
    <div
      v-if="!isValidHex(value)"
      class="hint error"
    >Expected a hex color like #FFFFFF</div>
  </span>
</template>

<script lang="ts">
import Vue from 'vue';

export function isValidHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

export function normalizeHex(value: string): string {
  const digits = value.trim().replace(/^#+/, '');

  if (digits === '') {
    return '#000000';
  }

  if (!/^[0-9a-fA-F]+$/.test(digits)) {
    return value.trim();
  }

  if (digits.length === 6) {
    return `#${digits}`;
  }

  // Three digits is the CSS shorthand, where each digit doubles.
  if (digits.length === 3) {
    return `#${digits.split('').map((digit) => digit + digit).join('')}`;
  }

  // One or two digits repeat to fill all six, giving a gray.
  if (digits.length === 1 || digits.length === 2) {
    return `#${digits.repeat(6 / digits.length)}`;
  }

  return value.trim();
}

export default Vue.extend({
  props: {
    value: String,
    id: String,
  },
  methods: {
    isValidHex,
    emit(value: string) {
      this.$emit('input', normalizeHex(value));
      // The typed text stays in the box when it normalizes to the current value.
      this.$forceUpdate();
    },
  },
});
</script>

<style scoped>
.field-input {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 8rem;
  padding-left: 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
}

.field-input input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.swatch {
  flex: 0 0 auto;
  width: 0.85rem;
  height: 0.85rem;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  background: transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  appearance: none;
}

.swatch::-webkit-color-swatch-wrapper {
  padding: 0;
}

.swatch::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.hint.error {
  color: var(--danger-11);
}
</style>
