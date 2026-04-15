<!--
  Copyright (c) 2026 Beekeeper Studio Team
  For support issues with this feature, contact @quinnjr on GitHub
-->
<template>
  <div class="migration-progress">
    <div class="progress-container">
      <div class="progress-header">
        <h3>
          <i class="material-icons">sync</i>
          Migration {{ statusText }}
        </h3>
      </div>

      <div class="progress-stats">
        <div class="stat-card">
          <div class="stat-value">
            {{ progress.tablesCompleted || 0 }}
          </div>
          <div class="stat-label">
            Tables Completed
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ progress.totalTables || 0 }}
          </div>
          <div class="stat-label">
            Total Tables
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ formatNumber(progress.rowsMigrated || 0) }}
          </div>
          <div class="stat-label">
            Rows Migrated
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="progress.totalTables > 0" class="progress-bar-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progressPercent + '%' }"
            :class="{ 'complete': isComplete, 'failed': isFailed }"
          />
        </div>
        <div class="progress-text">
          {{ progressPercent.toFixed(1) }}%
        </div>
      </div>

      <!-- Current Step -->
      <div v-if="progress.currentStep" class="current-step">
        <i class="material-icons rotating">sync</i>
        <div>
          <strong>{{ progress.currentStep }}</strong>
          <div v-if="progress.currentTable" class="current-table">
            Table: {{ progress.currentTable }}
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      <div v-if="isComplete" class="status-message success">
        <i class="material-icons">check_circle</i>
        <div>
          <strong>Migration Completed Successfully!</strong>
          <p>{{ progress.tablesCompleted }} table(s) migrated in {{ elapsedTime }}</p>
        </div>
      </div>

      <div v-if="isFailed" class="status-message error">
        <i class="material-icons">error</i>
        <div>
          <strong>Migration Failed</strong>
          <p>Please check the errors below for details</p>
        </div>
      </div>

      <div v-if="isCancelled" class="status-message warning">
        <i class="material-icons">cancel</i>
        <div>
          <strong>Migration Cancelled</strong>
          <p>The migration was cancelled by the user</p>
        </div>
      </div>

      <!-- Errors -->
      <div v-if="progress.errors && progress.errors.length > 0" class="errors-section">
        <h4>
          <i class="material-icons">warning</i>
          Errors ({{ progress.errors.length }})
        </h4>
        <div class="errors-list">
          <div
            v-for="(error, index) in progress.errors"
            :key="index"
            class="error-item"
          >
            <div class="error-header">
              <strong>{{ error.table }}</strong>
              <span class="error-time">{{ formatTime(error.timestamp) }}</span>
            </div>
            <div class="error-message">
              {{ error.error }}
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <button
          v-if="!isComplete && !isFailed && !isCancelled"
          class="btn btn-flat"
          @click="$emit('cancel')"
        >
          Cancel Migration
        </button>
        <button
          v-if="isFailed"
          class="btn btn-primary"
          @click="$emit('retry')"
        >
          Retry Migration
        </button>
        <button
          v-if="isComplete || isFailed || isCancelled"
          class="btn btn-primary"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { MigrationProgress, MigrationStatus } from '@/lib/migration';

export default Vue.extend({
  props: {
    progress: {
      type: Object as () => MigrationProgress,
      required: true
    }
  },
  computed: {
    statusText(): string {
      switch (this.progress.status) {
        case MigrationStatus.IN_PROGRESS:
          return 'In Progress';
        case MigrationStatus.COMPLETED:
          return 'Completed';
        case MigrationStatus.FAILED:
          return 'Failed';
        case MigrationStatus.CANCELLED:
          return 'Cancelled';
        default:
          return 'Pending';
      }
    },
    progressPercent(): number {
      if (!this.progress.totalTables) return 0;
      return (this.progress.tablesCompleted / this.progress.totalTables) * 100;
    },
    isComplete(): boolean {
      return this.progress.status === MigrationStatus.COMPLETED;
    },
    isFailed(): boolean {
      return this.progress.status === MigrationStatus.FAILED;
    },
    isCancelled(): boolean {
      return this.progress.status === MigrationStatus.CANCELLED;
    },
    elapsedTime(): string {
      if (!this.progress.startTime) return '-';
      const end = this.progress.endTime || new Date();
      const start = new Date(this.progress.startTime);
      const diff = end.getTime() - start.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    }
  },
  methods: {
    formatNumber(num: number): string {
      return num.toLocaleString();
    },
    formatTime(timestamp: Date): string {
      return new Date(timestamp).toLocaleTimeString();
    }
  }
});
</script>

<style scoped lang="scss">
.migration-progress {
  padding: 2rem;
  overflow-y: auto;

  .progress-container {
    max-width: 900px;
    margin: 0 auto;
  }

  .progress-header {
    text-align: center;
    margin-bottom: 2rem;

    h3 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      font-weight: 600;

      .material-icons {
        font-size: 2rem;
        color: var(--theme-primary);
      }
    }
  }

  .progress-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background-color: var(--bg-dark);
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--theme-primary);
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-dark);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .progress-bar-container {
    margin-bottom: 2rem;

    .progress-bar {
      height: 24px;
      background-color: var(--bg-dark);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 0.5rem;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--theme-primary), var(--theme-primary-light));
        transition: width 0.3s ease;

        &.complete {
          background: linear-gradient(90deg, #4caf50, #66bb6a);
        }

        &.failed {
          background: linear-gradient(90deg, #f44336, #e57373);
        }
      }
    }

    .progress-text {
      text-align: center;
      font-weight: 600;
      color: var(--text-dark);
    }
  }

  .current-step {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: var(--bg-dark);
    border-radius: 8px;
    margin-bottom: 1rem;

    .material-icons {
      font-size: 2rem;
      color: var(--theme-primary);
    }

    .rotating {
      animation: rotate 2s linear infinite;
    }

    .current-table {
      margin-top: 0.25rem;
      font-size: 0.875rem;
      color: var(--text-dark);
    }
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .status-message {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;

    .material-icons {
      font-size: 3rem;
    }

    &.success {
      background-color: #e8f5e9;
      color: #2e7d32;

      .material-icons {
        color: #4caf50;
      }
    }

    &.error {
      background-color: #ffebee;
      color: #c62828;

      .material-icons {
        color: #f44336;
      }
    }

    &.warning {
      background-color: #fff3e0;
      color: #e65100;

      .material-icons {
        color: #ff9800;
      }
    }

    p {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      opacity: 0.9;
    }
  }

  .errors-section {
    margin: 2rem 0;

    h4 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      color: var(--error-color);

      .material-icons {
        color: var(--error-color);
      }
    }

    .errors-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .error-item {
      padding: 1rem;
      background-color: #ffebee;
      border-left: 4px solid #f44336;
      border-radius: 4px;
      margin-bottom: 0.5rem;

      .error-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;

        strong {
          color: #c62828;
        }

        .error-time {
          font-size: 0.875rem;
          color: var(--text-dark);
        }
      }

      .error-message {
        font-size: 0.875rem;
        color: #d32f2f;
        font-family: monospace;
      }
    }
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
  }
}
</style>
