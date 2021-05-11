<template>
  <div>
    
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
    return {}
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
