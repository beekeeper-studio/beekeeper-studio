<!--
  Copyright (c) 2026 Beekeeper Studio Team
  For support issues with this feature, contact @quinnjr on GitHub
-->
<template>
  <div class="tabcontent migration-tab">
    <div v-if="!migrationRunning" class="migration-stepper-wrapper">
      <Stepper
        :steps="steps"
        button-portal-target="migration-stepper-buttons"
        @finished="startMigration"
      />
    </div>
    <div v-else class="migration-progress-wrapper">
      <MigrationProgress
        :progress="migrationProgress"
        @cancel="cancelMigration"
        @retry="retryMigration"
        @close="closeMigration"
      />
    </div>
    <status-bar :active="active">
      <div class="statusbar-info col flex expand">
        <span
          v-if="migrationState.selectedTables.length > 0"
          class="statusbar-item"
          title="Tables Selected"
        >
          <i class="material-icons">table_chart</i>
          <span>{{ migrationState.selectedTables.length }} table(s)</span>
        </span>
        <span
          v-if="migrationState.config.sourceConnectionId"
          class="statusbar-item"
          title="Source Connection"
        >
          <i class="material-icons">input</i>
          <span>{{ getConnectionName(migrationState.config.sourceConnectionId) }}</span>
        </span>
        <span
          v-if="migrationState.config.targetConnectionId"
          class="statusbar-item"
          title="Target Connection"
        >
          <i class="material-icons">output</i>
          <span>{{ getConnectionName(migrationState.config.targetConnectionId) }}</span>
        </span>
      </div>
      <portal-target
        class="portal-stepper-buttons"
        name="migration-stepper-buttons"
      />
    </status-bar>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState, mapActions } from 'vuex';
import Stepper from './stepper/Stepper.vue';
import MigrationConfiguration from './migration/MigrationConfiguration.vue';
import MigrationTableSelection from './migration/MigrationTableSelection.vue';
import MigrationReview from './migration/MigrationReview.vue';
import MigrationProgress from './migration/MigrationProgress.vue';
import StatusBar from './common/StatusBar.vue';
import { Step } from './stepper/models';
import { MigrationConfig, MigrationType, MigrationProgress as IMigrationProgress } from '@/lib/migration';
import { IBasicDatabaseClient } from '@/lib/db/types';
import log from 'electron-log/renderer';

export default Vue.extend({
  components: {
    Stepper,
    MigrationProgress,
    StatusBar
  },
  props: {
    tab: {
      type: Object,
      required: true
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      migrationState: {
        config: {
          sourceConnectionId: null,
          targetConnectionId: null,
          migrationType: MigrationType.SCHEMA_AND_DATA,
          tables: [],
          dropExisting: false,
          disableForeignKeys: true,
          batchSize: 1000
        } as MigrationConfig,
        selectedTables: [] as string[],
        availableTables: [] as any[],
        tablesLoading: false,
        tablesError: null as string | null
      },
      migrationRunning: false,
      migrationProgress: null as IMigrationProgress | null,
      sourceClient: null as IBasicDatabaseClient | null,
      targetClient: null as IBasicDatabaseClient | null
    };
  },
  computed: {
    ...mapState('data/connections', {
      savedConnections: 'items'
    }),
    steps(): Step[] {
      return [
        {
          key: 'configuration',
          title: 'Configuration',
          icon: 'settings',
          component: MigrationConfiguration,
          completed: false,
          stepperProps: {
            config: this.migrationState.config,
            availableConnections: this.savedConnections
          },
          validate: () => {
            if (!this.migrationState.config.sourceConnectionId) {
              return 'Please select a source connection';
            }
            if (!this.migrationState.config.targetConnectionId) {
              return 'Please select a target connection';
            }
            if (this.migrationState.config.sourceConnectionId === this.migrationState.config.targetConnectionId) {
              return 'Source and target connections must be different';
            }
            return null;
          }
        },
        {
          key: 'tables',
          title: 'Select Tables',
          icon: 'table_chart',
          component: MigrationTableSelection,
          completed: false,
          stepperProps: this.migrationState,
          onEnter: async () => {
            await this.loadSourceTables();
          },
          validate: () => {
            // Allow empty selection (will migrate all tables)
            return null;
          }
        },
        {
          key: 'review',
          title: 'Review',
          icon: 'check',
          component: MigrationReview,
          completed: false,
          stepperProps: {
            config: {
              ...this.migrationState.config,
              tables: this.migrationState.selectedTables.length > 0 ? this.migrationState.selectedTables : undefined
            },
            sourceConnection: this.getConnection(this.migrationState.config.sourceConnectionId),
            targetConnection: this.getConnection(this.migrationState.config.targetConnectionId)
          },
          validate: () => {
            return null;
          }
        }
      ];
    }
  },
  methods: {
    ...mapActions({
      initializeMigration: 'migration/initialize',
      startMigrationAction: 'migration/start',
      cancelMigrationAction: 'migration/cancel',
      resetMigration: 'migration/reset'
    }),
    getConnection(id: number) {
      return this.savedConnections.find((conn: any) => conn.id === id);
    },
    getConnectionName(id: number): string {
      const conn = this.getConnection(id);
      return conn?.name || 'Unknown';
    },
    async loadSourceTables() {
      if (!this.migrationState.config.sourceConnectionId) {
        return;
      }

      this.migrationState.tablesLoading = true;
      this.migrationState.tablesError = null;

      try {
        // Create a connection to the source database
        const connection = this.getConnection(this.migrationState.config.sourceConnectionId);
        if (!connection) {
          throw new Error('Source connection not found');
        }

        // Get the database client
        // Note: This would need to be implemented based on the app's connection management
        // For now, we'll simulate loading tables
        log.info('Loading tables from source connection:', connection.name);
        
        // TODO: Implement actual table loading using the connection
        // This is a placeholder that would need to be connected to the actual database client
        this.migrationState.availableTables = [];
        
      } catch (error) {
        log.error('Error loading source tables:', error);
        this.migrationState.tablesError = error.message;
      } finally {
        this.migrationState.tablesLoading = false;
      }
    },
    async startMigration() {
      try {
        this.migrationRunning = true;

        // Update config with selected tables
        if (this.migrationState.selectedTables.length > 0) {
          this.migrationState.config.tables = this.migrationState.selectedTables;
        }

        log.info('Starting migration with config:', this.migrationState.config);

        // Initialize migration in store
        // Note: This would need actual client instances
        await this.initializeMigration({
          sourceClient: this.sourceClient,
          targetClient: this.targetClient,
          config: this.migrationState.config
        });

        // Start migration
        const progress = await this.startMigrationAction();
        this.migrationProgress = progress;

      } catch (error) {
        log.error('Migration failed:', error);
        this.migrationRunning = false;
        this.$noty.error(`Migration failed: ${error.message}`);
      }
    },
    async cancelMigration() {
      await this.cancelMigrationAction();
    },
    async retryMigration() {
      this.migrationRunning = false;
      this.migrationProgress = null;
      await this.resetMigration();
    },
    closeMigration() {
      this.migrationRunning = false;
      this.migrationProgress = null;
      this.resetMigration();
      this.$emit('close');
    }
  },
  beforeDestroy() {
    this.resetMigration();
  }
});
</script>

<style scoped lang="scss">
.migration-tab {
  display: flex;
  flex-direction: column;
  height: 100%;

  .migration-stepper-wrapper {
    height: 100%;
    overflow-y: auto;
  }

  .migration-progress-wrapper {
    height: 100%;
    overflow-y: auto;
  }
}

// Unscoped style for portal content
::v-deep .portal-stepper-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  
  .portal {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
}
</style>
