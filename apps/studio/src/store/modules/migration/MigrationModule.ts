// Copyright (c) 2026 Beekeeper Studio Team

import { Module } from 'vuex';
import { State as RootState } from '../../index';
import { MigrationService, MigrationConfig, MigrationProgress, MigrationStatus } from '@/lib/migration';
import { IBasicDatabaseClient } from '@/lib/db/types';
import log from 'electron-log/renderer';

interface State {
  migrationService: MigrationService | null;
  progress: MigrationProgress | null;
  isActive: boolean;
  sourceClient: IBasicDatabaseClient | null;
  targetClient: IBasicDatabaseClient | null;
  config: MigrationConfig | null;
}

export const MigrationModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    migrationService: null,
    progress: null,
    isActive: false,
    sourceClient: null,
    targetClient: null,
    config: null
  }),
  getters: {
    progress(state): MigrationProgress | null {
      return state.progress;
    },
    isActive(state): boolean {
      return state.isActive;
    },
    config(state): MigrationConfig | null {
      return state.config;
    },
    canStart(state): boolean {
      return !state.isActive && 
             state.sourceClient !== null && 
             state.targetClient !== null &&
             state.config !== null;
    },
    isComplete(state): boolean {
      return state.progress?.status === MigrationStatus.COMPLETED;
    },
    isFailed(state): boolean {
      return state.progress?.status === MigrationStatus.FAILED;
    },
    isCancelled(state): boolean {
      return state.progress?.status === MigrationStatus.CANCELLED;
    }
  },
  mutations: {
    setMigrationService(state, service: MigrationService) {
      state.migrationService = service;
    },
    setProgress(state, progress: MigrationProgress) {
      state.progress = progress;
    },
    setIsActive(state, isActive: boolean) {
      state.isActive = isActive;
    },
    setSourceClient(state, client: IBasicDatabaseClient) {
      state.sourceClient = client;
    },
    setTargetClient(state, client: IBasicDatabaseClient) {
      state.targetClient = client;
    },
    setConfig(state, config: MigrationConfig) {
      state.config = config;
    },
    clearMigration(state) {
      if (state.migrationService) {
        state.migrationService.removeAllListeners();
      }
      state.migrationService = null;
      state.progress = null;
      state.isActive = false;
      state.sourceClient = null;
      state.targetClient = null;
      state.config = null;
    }
  },
  actions: {
    /**
     * Initialize migration with source and target clients
     */
    initialize(context, { sourceClient, targetClient, config }: { 
      sourceClient: IBasicDatabaseClient, 
      targetClient: IBasicDatabaseClient,
      config: MigrationConfig 
    }) {
      context.commit('setSourceClient', sourceClient);
      context.commit('setTargetClient', targetClient);
      context.commit('setConfig', config);
    },

    /**
     * Start the migration process
     */
    async start(context) {
      if (!context.getters.canStart) {
        throw new Error('Cannot start migration: missing configuration or clients');
      }

      try {
        // Create migration service
        const service = new MigrationService(
          context.state.sourceClient!,
          context.state.targetClient!,
          context.state.config!
        );

        // Set up progress listener
        service.on('progress', (progress: MigrationProgress) => {
          context.commit('setProgress', progress);
        });

        context.commit('setMigrationService', service);
        context.commit('setIsActive', true);

        // Start migration
        log.info('Starting migration...');
        const finalProgress = await service.migrate();
        
        context.commit('setProgress', finalProgress);
        context.commit('setIsActive', false);

        return finalProgress;
      } catch (error) {
        log.error('Migration failed:', error);
        context.commit('setIsActive', false);
        throw error;
      }
    },

    /**
     * Cancel the migration
     */
    async cancel(context) {
      if (context.state.migrationService) {
        context.state.migrationService.cancel();
      }
    },

    /**
     * Reset migration state
     */
    reset(context) {
      context.commit('clearMigration');
    }
  }
};
