<template>
  <div>
    <h4 class="mb-2 flex align-center">
      <i class="material-icons" style="margin-right: 6px;">speed</i> Account Limits
    </h4>
    <div class="form-group">
      <label>Max Queries per Hour:</label>
      <input
        type="number"
        v-model.number="localUser.maxQueries"
        class="form-control"
        placeholder="0 for no limit"
        min="0"
      >
    </div>
    <div class="form-group">
      <label>Max Updates per Hour:</label>
      <input
        type="number"
        v-model.number="localUser.maxUpdates"
        class="form-control"
        placeholder="0 for no limit"
        min="0"
      >
    </div>
    <div class="form-group">
      <label>Max Connections per Hour:</label>
      <input
        type="number"
        v-model.number="localUser.maxConnections"
        class="form-control"
        placeholder="0 for no limit"
        min="0"
      >
    </div>
    <div class="form-group">
      <label>Max User Connections:</label>
      <input
        type="number"
        v-model.number="localUser.maxUserConnections"
        class="form-control"
        placeholder="0 for no limit"
        min="0"
      >
    </div>
  </div>
</template>

<script>
export default {
  props: {
    localUser: Object
  }
}
</script>
