<template>
  <div class="sqlite-form">
    <div class="host-port-user-password">
      <div class="row gutter">
        <div class="col form-group">
          <label for="Database" required>Database File</label>
          <input type="file" @change="setDatabaseFile">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: ['config'],
    methods: {
      setDatabaseFile(event) {
        this.config.defaultDatabase = event.target.files[0].path
      }
    }
  }
</script>