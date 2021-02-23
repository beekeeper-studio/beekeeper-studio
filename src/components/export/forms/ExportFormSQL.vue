<template>
  <div>
    <div class="form-group">
      <div class="form-group row">
        <label for="schema" class="checkbox-group">
          <input
            v-model="options.schema"
            id="schema"
            type="checkbox"
            name="schema"
            class="form-control"
          />
          <span>Include schema</span>
        </label>
      </div>
      <div class="form-group row">
        <label for="createTable" class="checkbox-group">
          <input
            v-model="options.createTable"
            id="createTable"
            type="checkbox"
            name="createTable"
            class="form-control"
          />
          <span>Include table creation query</span>
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
        createTable: false,
        schema: false,
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