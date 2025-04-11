<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config">
    </common-server-inputs>
  </div>
</template>

<script>
import CommonServerInputs from './CommonServerInputs.vue'

export default {
  components: { CommonServerInputs },
  props: ['config']
}
</script>

<style>

</style>
