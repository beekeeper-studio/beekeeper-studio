<template>
  <div>
    <div class="form-group">
      <div class="form-group row">
        <label>Delimiter</label>
        <input
          v-model="options.delimiter"
          type="text"
          class="form-control"
          autofocus
          ref="paramInput"
          value=";"
        />
      </div>
    </div>
    <div class="form-group">
      <div class="form-group row">
        <label for="headerRow" class="checkbox-group">
          <input
            v-model="options.header"
            id="headerRow"
            type="checkbox"
            name="headerRow"
            class="form-control"
          />
          <span>Include header row</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    value: {
      required: true,
    },
  },
  data() {
    return {
      options: {
        header: false,
        delimiter: ";",
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