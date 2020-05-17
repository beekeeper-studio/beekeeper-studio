<template>
  <input type="radio" :value="color" :checked="checked" :class="`connection-label connection-label-color-${colorClass}`" v-on:input="$emit('input', $event.target.value)">
</template>

<script>
  export default {
    props: ['value', 'checked', 'color'],
    computed: {
      colorClass() {
        return this.color || 'none'
      }
    }
  }
</script>
