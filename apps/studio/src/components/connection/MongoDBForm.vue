<template>
  <div class="mongodb-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        MongoDB support is in alpha.
        <a href="https://docs.beekeeperstudio.io/user_guide/connecting/mongodb">Supported features</a>,
        <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">report an issue</a>.
      </span>
    </div>
    <div class="form-group">
      <!-- NOTE(@day): this means that the password will be stored plaintext, we need a better solution -->
      <label for="url" required>
        Database URL
      </label>
      <BaseInput v-model="config.url" id="url" type="text" class="form-control" name="url"/>
    </div>
    <div class="form-group">
      <label for="defaultDatabase">Default Database</label>
      <BaseInput type="text" class="form-control" v-model="config.defaultDatabase"/>
    </div>
  </div>
</template>

<script lang="ts">
import BaseInput from "@/components/common/form/BaseInput.vue";

export default {
  components: { BaseInput },
  props: ['config']
}
</script>

<style>

</style>
