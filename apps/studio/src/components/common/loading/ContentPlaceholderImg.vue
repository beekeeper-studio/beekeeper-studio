<template>
  <div :style="style" :class="className" />
</template>

<script>
// Original - copyright https://github.com/michalsnik/vue-content-placeholders

export default {
  name: 'content-placeholders-img',
  props: {
    circle: {
      type: Boolean,
      default: false,
    },
    style: {
      tpe: String,
      default: ""
    }
  },
  computed: {
    className() {
      return {
        'vue-content-placeholders-img': true,
        'vue-content-placeholders-img-is-circle': this.circle
      }
    },
  },
  data () {
    return {
    }
  },
}
</script>