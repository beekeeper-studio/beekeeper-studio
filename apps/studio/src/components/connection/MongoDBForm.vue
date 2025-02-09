<template>
  <div class="mongodb-form">
    <div class="form-group">
      <!-- NOTE(@day): this means that the password will be stored plaintext, we need a better solution --> 
      <label for="url" required>
        Database URL
      </label>
      <input
        v-model="config.url"
        id="url"
        type="text"
        class="form-control"
        name="url">
    </div>
    <div class="form-group">
      <label for="defaultDatabase">Default Database</label>
      <input
        type="text"
        class="form-control"
        v-model="config.defaultDatabase">
    </div>
  </div>  
</template>

<script lang="ts">

export default {
  props: ['config']
}
</script>

<style>

</style>
