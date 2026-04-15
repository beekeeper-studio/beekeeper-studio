<template>
  <div class="migration-review small-wrap">
    <div class="migration-content">
      <div class="page-content flex-col">
        <div class="row">
          <div class="card-flat padding section expand">
            <h3 class="card-title">Review Migration Settings</h3>
            
            <div class="review-section">
              <h4>Source Database</h4>
              <div class="review-item">
                <span class="label">Connection:</span>
                <span class="value">{{ sourceConnection?.name || 'Not selected' }}</span>
              </div>
              <div class="review-item">
                <span class="label">Type:</span>
                <span class="value">{{ sourceConnection?.connectionType || '-' }}</span>
              </div>
            </div>

            <div class="review-section">
              <h4>Target Database</h4>
              <div class="review-item">
                <span class="label">Connection:</span>
                <span class="value">{{ targetConnection?.name || 'Not selected' }}</span>
              </div>
              <div class="review-item">
                <span class="label">Type:</span>
                <span class="value">{{ targetConnection?.connectionType || '-' }}</span>
              </div>
            </div>

            <div class="review-section">
              <h4>Migration Options</h4>
              <div class="review-item">
                <span class="label">Migration Type:</span>
                <span class="value">{{ formatMigrationType(config.migrationType) }}</span>
              </div>
              <div class="review-item">
                <span class="label">Tables:</span>
                <span class="value">
                  {{ config.tables && config.tables.length > 0 ? `${config.tables.length} selected` : 'All tables' }}
                </span>
              </div>
              <div class="review-item">
                <span class="label">Drop Existing:</span>
                <span class="value">{{ config.dropExisting ? 'Yes' : 'No' }}</span>
              </div>
              <div class="review-item">
                <span class="label">Disable Foreign Keys:</span>
                <span class="value">{{ config.disableForeignKeys !== false ? 'Yes' : 'No' }}</span>
              </div>
              <div class="review-item">
                <span class="label">Batch Size:</span>
                <span class="value">{{ config.batchSize || 1000 }} rows</span>
              </div>
            </div>

            <div v-if="config.tables && config.tables.length > 0" class="review-section">
              <h4>Selected Tables ({{ config.tables.length }})</h4>
              <div class="tables-list">
                <div
                  v-for="table in config.tables"
                  :key="table"
                  class="table-chip"
                >
                  <i class="material-icons">table_chart</i>
                  {{ table }}
                </div>
              </div>
            </div>

            <div class="warning-box">
              <i class="material-icons">warning</i>
              <div>
                <strong>Important:</strong> Please review all settings carefully before proceeding.
                <span v-if="config.dropExisting" class="danger-text">
                  <br>⚠️ Existing tables in the target database will be dropped!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { MigrationConfig } from '@/lib/migration';

export default Vue.extend({
  props: {
    config: {
      type: Object as () => MigrationConfig,
      required: true
    },
    sourceConnection: {
      type: Object,
      default: null
    },
    targetConnection: {
      type: Object,
      default: null
    }
  },
  methods: {
    formatMigrationType(type: string): string {
      switch (type) {
        case 'schema_and_data':
          return 'Schema and Data';
        case 'schema_only':
          return 'Schema Only';
        case 'data_only':
          return 'Data Only';
        default:
          return type;
      }
    }
  }
});
</script>

<style scoped lang="scss">
.migration-review {
  overflow-y: auto;
  padding: 1rem;

  .migration-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .section {
    margin-bottom: 1rem;
  }

  .review-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color);

    &:last-of-type {
      border-bottom: none;
    }

    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text-dark);
    }
  }

  .review-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;

    .label {
      font-weight: 500;
      color: var(--text-dark);
    }

    .value {
      font-weight: 600;
      color: var(--text-default);
    }
  }

  .tables-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
    padding: 0.5rem;
    background-color: var(--bg-dark);
    border-radius: 4px;
  }

  .table-chip {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    background-color: var(--theme-primary);
    color: white;
    border-radius: 16px;
    font-size: 0.875rem;

    .material-icons {
      font-size: 1rem;
    }
  }

  .warning-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background-color: var(--warning-bg, #fff3cd);
    border: 1px solid var(--warning-border, #ffc107);
    border-radius: 4px;
    margin-top: 2rem;

    .material-icons {
      color: var(--warning-color, #ff9800);
      flex-shrink: 0;
    }

    strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    .danger-text {
      color: var(--error-color, #dc3545);
      font-weight: 600;
    }
  }
}
</style>
