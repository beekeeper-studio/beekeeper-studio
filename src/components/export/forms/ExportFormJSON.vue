<template>
  <div>
    <div class="form-group">
      <div class="form-group row">
        <label for="prettyprint" class="checkbox-group">
          <input
            v-model="options.prettyprint"
            id="prettyprint"
            type="checkbox"
            name="prettyprint"
            class="form-control"
          />
          <span>Pretty-print</span>
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
        prettyprint: true,
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