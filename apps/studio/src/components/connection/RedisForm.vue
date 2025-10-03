<template>
  <div class="redis-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        Redis support is still in beta. Please report any problems on <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">our issue tracker</a>.
      </span>
    </div>
    
    <common-server-inputs :config="config" />
  </div>
</template>

<script>
import CommonServerInputs from './CommonServerInputs.vue'

export default {
  name: "RedisForm",
  components: {
    CommonServerInputs
  },
  props: {
    config: {
      type: Object,
      required: true,
    },
    testing: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style>

</style>
