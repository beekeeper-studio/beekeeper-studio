<template>
  <div class="sqlite-form">
    <div class="host-port-user-password">
      <div class="row gutter">
        <div class="col form-group">
          <label for="Database" required>Database File</label>
          <file-picker v-model="config.defaultDatabase"></file-picker>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import FilePicker from '@/components/common/form/FilePicker'
  export default {
    props: ['config'],
    components: {
      FilePicker
    }
  }
</script>