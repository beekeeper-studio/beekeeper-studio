<template>
  <div class="migration-tables small-wrap">
    <div class="migration-content">
      <div class="page-content flex-col">
        <div class="row">
          <div class="card-flat padding section expand">
            <div class="flex flex-between">
              <h3 class="card-title">Tables to Migrate</h3>
              <div class="btn-group">
                <button
                  class="btn btn-flat btn-small"
                  @click="selectAll"
                >
                  Select All
                </button>
                <button
                  class="btn btn-flat btn-small"
                  @click="deselectAll"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div v-if="loading" class="text-center">
              <i class="material-icons spinner">rotate_right</i>
              <p>Loading tables...</p>
            </div>

            <div v-else-if="error" class="alert alert-danger">
              <i class="material-icons">error</i>
              {{ error }}
            </div>

            <div v-else-if="tables.length === 0" class="empty-state">
              <i class="material-icons">table_chart</i>
              <p>No tables found in the source database</p>
            </div>

            <div v-else class="table-list">
              <div
                v-for="(table, index) in tables"
                :key="index"
                class="table-item"
              >
                <label class="checkbox-group">
                  <input
                    v-model="selectedTables"
                    :value="table.name"
                    type="checkbox"
                    class="form-control"
                  >
                  <span class="table-name">
                    <i class="material-icons">table_chart</i>
                    {{ table.schema ? `${table.schema}.` : '' }}{{ table.name }}
                  </span>
                  <span v-if="table.rowCount !== undefined" class="table-count">
                    {{ formatNumber(table.rowCount) }} rows
                  </span>
                </label>
              </div>
            </div>

            <div v-if="selectedTables.length > 0" class="selection-summary">
              <strong>{{ selectedTables.length }}</strong> table(s) selected for migration
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  props: {
    tables: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    value: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedTables: [...this.value] as string[]
    };
  },
  watch: {
    selectedTables(newValue) {
      this.$emit('input', newValue);
    },
    value(newValue) {
      this.selectedTables = [...newValue];
    }
  },
  methods: {
    selectAll() {
      this.selectedTables = this.tables.map((t: any) => t.name);
    },
    deselectAll() {
      this.selectedTables = [];
    },
    formatNumber(num: number): string {
      return num.toLocaleString();
    }
  }
});
</script>

<style scoped lang="scss">
.migration-tables {
  overflow-y: auto;
  padding: 1rem;

  .migration-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .section {
    margin-bottom: 1rem;
  }

  .btn-group {
    display: flex;
    gap: 0.5rem;
  }

  .spinner {
    animation: spin 1s linear infinite;
    font-size: 2rem;
    color: var(--theme-primary);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-dark);

    .material-icons {
      font-size: 4rem;
      opacity: 0.3;
    }

    p {
      margin-top: 1rem;
      font-size: 1.1rem;
    }
  }

  .table-list {
    max-height: 500px;
    overflow-y: auto;
    margin-top: 1rem;
  }

  .table-item {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color);

    &:hover {
      background-color: var(--bg-dark);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      margin: 0;

      input[type="checkbox"] {
        width: auto;
        margin: 0;
        flex-shrink: 0;
      }

      .table-name {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        font-weight: 500;

        .material-icons {
          font-size: 1.2rem;
          opacity: 0.6;
        }
      }

      .table-count {
        color: var(--text-dark);
        font-size: 0.875rem;
        margin-left: auto;
      }
    }
  }

  .selection-summary {
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: var(--bg-dark);
    border-radius: 4px;
    text-align: center;

    strong {
      color: var(--theme-primary);
    }
  }

  .alert {
    padding: 1rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &.alert-danger {
      background-color: var(--error-color);
      color: white;
    }
  }
}
</style>
