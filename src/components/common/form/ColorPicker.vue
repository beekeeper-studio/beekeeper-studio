<template>
  <div>
    <input
      type="radio"
      v-for="color in colors"
      @change="$emit('input', color)"
      :key="color"
      :value="color"
      :checked="color == (value || 'default')"
      :class="['connection-label', getColorClass(color)]">
  </div>
</template>

<script>
  export default {
    props: ['value'],
    data: function() {
      return {
        colors: [
          'default',
          'red',
          'orange',
          'yellow',
          'green',
          'blue',
          'purple',
          'pink',
        ]
      };
    },
    methods: {
      getColorClass: function(color) {
        const suffix = color ? color : 'default';
        return `connection-label-color-${suffix}`;
      }
    }
  }
</script>
