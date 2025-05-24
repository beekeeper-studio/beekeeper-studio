<template>
  <div v-if="showPinEntry">
    Hello
  </div>
</template>
<script lang="ts">
import Vue from 'vue';

  export default Vue.extend({
    computed: {
      shouldAskForPin() {
        return this.$bksC
      }
    }
    methods: {

    }
  })
</script>