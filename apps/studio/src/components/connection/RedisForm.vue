<template>
  <div class="redis-form">
    <!-- Connection Details -->
    <div class="form-group">
      <label for="host">Host</label>
      <input
        id="host"
        v-model="config.host"
        type="text"
        class="form-control"
        placeholder="localhost"
      >
    </div>

    <div class="form-group">
      <label for="port">Port</label>
      <input
        id="port"
        v-model.number="config.port"
        type="number"
        class="form-control"
        placeholder="6379"
      >
    </div>

    <!-- Authentication -->
    <div class="form-group">
      <label for="password">Password (optional)</label>
      <input
        id="password"
        v-model="config.password"
        type="password"
        class="form-control"
        placeholder="password"
      >
    </div>

    <!-- Redis Specific Options -->
    <div class="form-group">
      <label for="database">Database</label>
      <input
        id="database"
        v-model="config.defaultDatabase"
        type="text"
        class="form-control"
        placeholder="0"
      >
      <small class="form-text text-muted">
        Not applicable to Redis Cluster
      </small>
    </div>
  </div>
</template>

<script>
export default {
  name: "RedisForm",
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
  created() {
    // Set default values if not already set
    if (!this.config.host) {
      this.$set(this.config, "host", "localhost");
    }
    if (!this.config.port) {
      this.$set(this.config, "port", 6379);
    }
    if (!this.config.defaultDatabase) {
      this.$set(this.config, "defaultDatabase", "0");
    }
    if (!this.config.options) {
      this.$set(this.config, "options", {});
    }
  },
};
</script>

<style scoped>
.redis-form {
  padding: 1rem 0;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: var(--text-light);
}
.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-color);
  color: var(--text-color);
}
.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}
.form-control::placeholder {
  color: var(--text-lighter);
}
.form-text {
  margin-top: 0.25rem;
  font-size: 0.875rem;
}
.text-muted {
  color: var(--text-lighter);
}
</style>
