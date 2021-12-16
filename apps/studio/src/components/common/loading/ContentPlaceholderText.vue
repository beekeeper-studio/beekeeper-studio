<template>
  <div :class="className">
    <div v-for="n in lines" :key="n" :class="`${className}__line`" />
  </div>
</template>

<script>
// Original - copyright https://github.com/michalsnik/vue-content-placeholders
export default {
  name: 'content-placeholders-text',
  data () {
    return {
      className: 'vue-content-placeholders-text',
    }
  },
  props: {
    lines: {
      type: Number,
      default: 4,
    },
  },
}
</script>