<template>
  <div>
    <div class="form-group">
      <label>Field Delimitor</label>
      <BaseInput
        v-model="options.delimiter"
        type="text"
        class="form-control"
        autofocus
        ref="paramInput"
      />
    </div>
    <div class="form-group">
      <label
        for="headerRow"
        class="checkbox-group"
      >
        <input
          v-model="options.header"
          id="headerRow"
          type="checkbox"
          name="headerRow"
          class="form-control"
        >
        <span>Include Header</span>
      </label>
    </div>
  </div>
</template>

<script>
import BaseInput from '@/components/common/form/BaseInput.vue'
export default {
  components: { BaseInput },
  props: {
    value: {
      required: true,
    },
  },
  data() {
    return {
      options: {
        header: true,
        delimiter: ",",
      },
    };
  },
  watch: {
    options(newVal) {
      this.$emit("input", newVal);
    },
  },
  mounted() {
    this.$emit("input", this.options);
  },
};
</script>
