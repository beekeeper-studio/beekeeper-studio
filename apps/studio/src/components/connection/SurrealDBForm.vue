<template>
  <div class="surrealdb-form">
    <!-- Connection Details -->
    <div class="form-group">
      <label for="host">Host</label>
      <input
        id="host"
        v-model="config.host"
        type="text"
        class="form-control"
        placeholder="localhost"
      />
    </div>

    <div class="form-group">
      <label for="port">Port</label>
      <input
        id="port"
        v-model.number="config.port"
        type="number"
        class="form-control"
        placeholder="8000"
      />
    </div>

    <!-- Authentication -->
    <div class="form-group">
      <label for="user">Username (optional)</label>
      <input
        id="user"
        v-model="config.user"
        type="text"
        class="form-control"
        placeholder="root"
      />
    </div>

    <div class="form-group">
      <label for="password">Password (optional)</label>
      <input
        id="password"
        v-model="config.password"
        type="password"
        class="form-control"
        placeholder="password"
      />
    </div>

    <!-- SurrealDB Specific Options -->
    <div class="form-group">
      <label for="namespace">Namespace</label>
      <input
        id="namespace"
        v-model="namespace"
        type="text"
        class="form-control"
        placeholder="beekeeper"
      />
      <small class="form-text text-muted">
        SurrealDB namespace for organizing databases
      </small>
    </div>

    <div class="form-group">
      <label for="database">Database</label>
      <input
        id="database"
        v-model="config.defaultDatabase"
        type="text"
        class="form-control"
        placeholder="main"
      />
      <small class="form-text text-muted">
        Database name within the namespace
      </small>
    </div>

    <!-- SSL/TLS -->
    <div class="form-group">
      <label class="checkbox-group">
        <input
          v-model="config.ssl"
          type="checkbox"
        />
        <span class="checkbox-label">Use SSL/TLS (WSS/HTTPS)</span>
      </label>
      <small class="form-text text-muted">
        Enable secure WebSocket/HTTP connections
      </small>
    </div>

    <!-- Read Only Mode -->
    <div class="form-group">
      <label class="checkbox-group">
        <input
          v-model="config.readOnlyMode"
          type="checkbox"
        />
        <span class="checkbox-label">Read-only mode</span>
      </label>
      <small class="form-text text-muted">
        Prevent data modifications
      </small>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SurrealDBForm',
  props: {
    config: {
      type: Object,
      required: true
    },
    testing: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    namespace: {
      get() {
        return this.config.options?.namespace || 'beekeeper';
      },
      set(value) {
        if (!this.config.options) {
          this.$set(this.config, 'options', {});
        }
        this.$set(this.config.options, 'namespace', value);
      }
    }
  },
  created() {
    // Set default values if not already set
    if (!this.config.host) {
      this.$set(this.config, 'host', 'localhost');
    }
    if (!this.config.port) {
      this.$set(this.config, 'port', 8000);
    }
    if (!this.config.defaultDatabase) {
      this.$set(this.config, 'defaultDatabase', 'main');
    }
    if (!this.config.options) {
      this.$set(this.config, 'options', {});
    }
    if (!this.config.options.namespace) {
      this.$set(this.config.options, 'namespace', 'beekeeper');
    }
  }
};
</script>

<style scoped>
.surrealdb-form {
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

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  margin: 0;
}

.checkbox-label {
  font-weight: 500;
  color: var(--text-light);
}

.form-text {
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.text-muted {
  color: var(--text-lighter);
}
</style>