<template>
  <div class="migration-configuration small-wrap">
    <div class="migration-content">
      <form>
        <div class="page-content flex-col">
          <!-- Source Connection -->
          <div class="row">
            <div class="card-flat padding section expand">
              <h3 class="card-title">Source Database</h3>
              <div class="form-group">
                <label for="sourceConnection">Select Source Connection *</label>
                <select
                  id="sourceConnection"
                  v-model="localConfig.sourceConnectionId"
                  class="form-control custom-select"
                  :class="{ 'selected': !!localConfig.sourceConnectionId }"
                  required
                >
                  <option
                    disabled
                    selected
                    hidden
                    :value="null"
                  >
                    Choose a saved connection...
                  </option>
                  <option
                    v-for="conn in availableConnections"
                    :key="conn.id"
                    :value="conn.id"
                  >
                    {{ conn.name }} ({{ conn.connectionType }})
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Target Connection -->
          <div class="row">
            <div class="card-flat padding section expand">
              <h3 class="card-title">Target Database</h3>
              <div class="form-group">
                <label for="targetConnection">Select Target Connection *</label>
                <select
                  id="targetConnection"
                  v-model="localConfig.targetConnectionId"
                  class="form-control custom-select"
                  :class="{ 'selected': !!localConfig.targetConnectionId }"
                  required
                >
                  <option
                    disabled
                    selected
                    hidden
                    :value="null"
                  >
                    Choose a saved connection...
                  </option>
                  <option
                    v-for="conn in availableConnections"
                    :key="conn.id"
                    :value="conn.id"
                    :disabled="conn.id === localConfig.sourceConnectionId"
                  >
                    {{ conn.name }} ({{ conn.connectionType }})
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Migration Type -->
          <div class="row">
            <div class="card-flat padding section expand">
              <h3 class="card-title">Migration Options</h3>
              
              <div class="form-group">
                <label for="migrationType">Migration Type *</label>
                <select
                  id="migrationType"
                  v-model="localConfig.migrationType"
                  class="form-control custom-select"
                  required
                >
                  <option value="schema_and_data">Schema and Data</option>
                  <option value="schema_only">Schema Only</option>
                  <option value="data_only">Data Only</option>
                </select>
                <small class="form-text text-muted">
                  Choose what to migrate from source to target
                </small>
              </div>

              <div class="form-group">
                <label
                  for="dropExisting"
                  class="checkbox-group"
                >
                  <input
                    id="dropExisting"
                    v-model="localConfig.dropExisting"
                    type="checkbox"
                    class="form-control"
                  >
                  <span>Drop existing tables before migration</span>
                </label>
                <small class="form-text text-muted">
                  Warning: This will delete existing tables and data in the target database
                </small>
              </div>

              <div class="form-group">
                <label
                  for="disableForeignKeys"
                  class="checkbox-group"
                >
                  <input
                    id="disableForeignKeys"
                    v-model="localConfig.disableForeignKeys"
                    type="checkbox"
                    class="form-control"
                  >
                  <span>Disable foreign key checks during migration</span>
                </label>
                <small class="form-text text-muted">
                  Recommended: Temporarily disables foreign key constraints for faster migration
                </small>
              </div>

              <div class="form-group">
                <label for="batchSize">Batch Size</label>
                <input
                  id="batchSize"
                  v-model.number="localConfig.batchSize"
                  type="number"
                  class="form-control"
                  min="100"
                  max="10000"
                  step="100"
                >
                <small class="form-text text-muted">
                  Number of rows to migrate at once (default: 1000)
                </small>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { MigrationConfig, MigrationType } from '@/lib/migration';

export default Vue.extend({
  props: {
    config: {
      type: Object as () => MigrationConfig,
      required: true
    },
    availableConnections: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      localConfig: { ...this.config } as MigrationConfig
    };
  },
  watch: {
    localConfig: {
      deep: true,
      handler(newConfig) {
        this.$emit('update:config', newConfig);
      }
    },
    config: {
      deep: true,
      handler(newConfig) {
        this.localConfig = { ...newConfig };
      }
    }
  }
});
</script>

<style scoped lang="scss">
.migration-configuration {
  overflow-y: auto;
  padding: 1rem;

  .migration-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .section {
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1.5rem;

    label {
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: block;
    }

    small.form-text {
      display: block;
      margin-top: 0.25rem;
      color: var(--text-dark);
      font-size: 0.875rem;
    }
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;

    input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    span {
      font-weight: 500;
    }
  }
}
</style>
