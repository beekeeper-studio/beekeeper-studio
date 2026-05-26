<template>
  <div class="editable-text">
    <span class="editable-text-label">{{ initialValue }}</span>
    <input
      v-if="rename"
      ref="input"
      v-model="value"
      class="editable-text-input"
      :data-submitting="submitting"
      :disabled="submitting"
      @keyup.enter="onSubmit"
      @keyup.esc="onCancel"
      @blur="onCancel"
      @click.stop.prevent
      @dblclick.stop
      @mousedown.stop
    />
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "EditableText",
  props: {
    initialValue: {
      type: String,
      default: "",
    },
    rename: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    value: "",
    submitting: false,
  }),
  watch: {
    async rename(active: boolean) {
      this.submitting = false;

      if (!active) {
        return;
      }

      this.value = this.initialValue;

      await this.$nextTick();

      const input = this.$refs.input as HTMLInputElement | undefined;

      input?.focus();
      input?.select();
    },
  },
  methods: {
    onSubmit() {
      if (this.submitting) {
        return;
      }
      this.submitting = true;
      this.$emit("submit", this.value.trim());
    },
    onCancel() {
      if (this.submitting) {
        return;
      }
      this.$emit("cancel");
    },
  },
});
</script>

<style lang="scss" scoped>
.editable-text {
  position: relative;
  width: 100%;
}

.editable-text-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editable-text-input {
  width: 100%;
  height: auto;
  padding-inline: 0.1rem;
  font-size: inherit;
  line-height: normal;
  position: absolute;
  left: -0.15rem;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--theme-bg);

  &[data-submitting="true"] {
    border: none;
  }
}
</style>
