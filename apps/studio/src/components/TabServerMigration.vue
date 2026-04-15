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
    <div class="expand" />
    <status-bar :active="active">
      <div class="statusbar-info col flex expand">
        <span
          v-if="selectedTables.length > 0"
          class="statusbar-item"
          title="Tables Selected"
        >
          <i class="material-icons">table_chart</i>
          <span>{{ selectedTables.length }} table(s)</span>
        </span>
        <span
          v-if="migrationConfig.sourceConnectionId"
          class="statusbar-item"
          title="Source Connection"
        >
          <i class="material-icons">input</i>
          <span>{{ getConnectionName(migrationConfig.sourceConnectionId) }}</span>
        </span>
        <span
          v-if="migrationConfig.targetConnectionId"
          class="statusbar-item"
          title="Target Connection"
        >
          <i class="material-icons">output</i>
          <span>{{ getConnectionName(migrationConfig.targetConnectionId) }}</span>
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
      migrationConfig: {
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
      tablesError: null as string | null,
      migrationRunning: false,
      migrationProgress: null as IMigrationProgress | null,
      sourceClient: null as IBasicDatabaseClient | null,
      targetClient: null as IBasicDatabaseClient | null
    };
  },
  computed: {
    ...mapState({
      savedConnections: (state: any) => state.data.connections || []
    }),
    steps(): Step[] {
      return [
        {
          key: 'configuration',
          name: 'Configuration',
          component: MigrationConfiguration,
          props: {
            config: this.migrationConfig,
            availableConnections: this.savedConnections
          },
          on: {
            'update:config': (config: MigrationConfig) => {
              this.migrationConfig = { ...config };
            }
          },
          validate: () => {
            if (!this.migrationConfig.sourceConnectionId) {
              return 'Please select a source connection';
            }
            if (!this.migrationConfig.targetConnectionId) {
              return 'Please select a target connection';
            }
            if (this.migrationConfig.sourceConnectionId === this.migrationConfig.targetConnectionId) {
              return 'Source and target connections must be different';
            }
            return null;
          }
        },
        {
          key: 'tables',
          name: 'Select Tables',
          component: MigrationTableSelection,
          props: {
            tables: this.availableTables,
            loading: this.tablesLoading,
            error: this.tablesError,
            value: this.selectedTables
          },
          on: {
            input: (tables: string[]) => {
              this.selectedTables = tables;
            }
          },
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
          name: 'Review',
          component: MigrationReview,
          props: {
            config: {
              ...this.migrationConfig,
              tables: this.selectedTables.length > 0 ? this.selectedTables : undefined
            },
            sourceConnection: this.getConnection(this.migrationConfig.sourceConnectionId),
            targetConnection: this.getConnection(this.migrationConfig.targetConnectionId)
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
      if (!this.migrationConfig.sourceConnectionId) {
        return;
      }

      this.tablesLoading = true;
      this.tablesError = null;

      try {
        // Create a connection to the source database
        const connection = this.getConnection(this.migrationConfig.sourceConnectionId);
        if (!connection) {
          throw new Error('Source connection not found');
        }

        // Get the database client
        // Note: This would need to be implemented based on the app's connection management
        // For now, we'll simulate loading tables
        log.info('Loading tables from source connection:', connection.name);
        
        // TODO: Implement actual table loading using the connection
        // This is a placeholder that would need to be connected to the actual database client
        this.availableTables = [];
        
      } catch (error) {
        log.error('Error loading source tables:', error);
        this.tablesError = error.message;
      } finally {
        this.tablesLoading = false;
      }
    },
    async startMigration() {
      try {
        this.migrationRunning = true;

        // Update config with selected tables
        if (this.selectedTables.length > 0) {
          this.migrationConfig.tables = this.selectedTables;
        }

        log.info('Starting migration with config:', this.migrationConfig);

        // Initialize migration in store
        // Note: This would need actual client instances
        await this.initializeMigration({
          sourceClient: this.sourceClient,
          targetClient: this.targetClient,
          config: this.migrationConfig
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
    flex: 1;
    overflow: hidden;
  }

  .migration-progress-wrapper {
    flex: 1;
    overflow-y: auto;
  }

  .expand {
    flex: 1;
  }
}
</style>
