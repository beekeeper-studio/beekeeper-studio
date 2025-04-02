import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import fs from 'fs';
import path from 'path';
import os from 'os';
import knex, { Knex } from 'knex';
import { TrinoKnexClient } from '@shared/lib/knex-trino';
import fetch from 'node-fetch';

/**
 * TrinoTestContainer class that handles the creation, management, and connection
 * to a Trino container for testing purposes.
 */
export class TrinoTestContainer {
  private static instance: TrinoTestContainer;
  private container: StartedTestContainer | undefined;
  private knexInstance: Knex | undefined;

  // Default container configuration
  readonly DEFAULT_PORT = 8080;
  readonly DEFAULT_TAG = 'latest';
  readonly DEFAULT_USER = 'test';

  /**
   * Get the singleton instance of TrinoTestContainer
   */
  public static getInstance(): TrinoTestContainer {
    if (!this.instance) {
      this.instance = new TrinoTestContainer();
    }
    return this.instance;
  }

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Start the Trino container with specified catalog configuration
   *
   * @param options Configuration options for the Trino container
   * @returns The started container instance
   */
  public async start(options: {
    tag?: string;
    containerName?: string;
    withMemoryCatalog?: boolean;
    waitTimeout?: number;
    additionalCatalogs?: Record<string, string>;
  } = {}): Promise<StartedTestContainer> {
    if (this.container) {
      return this.container;
    }

    const {
      tag = this.DEFAULT_TAG,
      containerName = `trino-test-container-${Date.now()}`,
      withMemoryCatalog = true,
      waitTimeout = 300000, // 5 minutes
      additionalCatalogs = {},
    } = options;

    jest.setTimeout(waitTimeout);

    console.log(`Starting Trino container (${tag})...`);

    try {
      // Start the container with health check
      const containerBuilder = new GenericContainer(`trinodb/trino:${tag}`)
        .withName(containerName)
        .withExposedPorts(this.DEFAULT_PORT)
        .withHealthCheck({
          test: ["CMD", "/usr/bin/trino", '--server', 'localhost:8080', '--execute', 'select 1'],
          interval: 10 * 1000,       // 10 seconds
          timeout: 5 * 1000,         // 5 seconds
          startPeriod: 10 * 1000,    // 10 seconds
          retries: 10                 // default, can be adjusted
        })
        .withWaitStrategy(Wait.forHealthCheck());


      // Instead of mounting configs, we'll use environment variables to configure catalogs
      if (withMemoryCatalog) {
        containerBuilder.withEnvironment({'TRINO_ENABLE_MEMORY_CONNECTOR':'true'});
      }

      // For additional catalogs, we'd need to use a custom approach
      // but for now, we'll rely on the default connectors that ship with Trino

      // Start the container
      this.container = await containerBuilder.start();
      // Wait additional time to ensure Trino is fully ready
      // await this.waitForServerReadiness();

      console.log("Trino container started successfully");

      return this.container;
    } catch (err) {
      console.error("Failed to start Trino container:", err);
      throw err;
    }
  }

  /**
   * Stop and clean up the container
   */
  public async stop(): Promise<void> {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.knexInstance = undefined;
    }

    if (this.container) {
      console.log("Stopping Trino container...");
      try {
        await this.container.stop();
        console.log("Container stopped successfully");
      } catch (err) {
        console.error("Error stopping container:", err);
      }
      this.container = undefined;
    }

    // We no longer use tempDir, so no cleanup needed

  }

  /**
   * Get configuration for connecting to this Trino container
   */
  public getConnectionConfig(options: {
    catalog?: string;
    schema?: string;
    user?: string;
  } = {}): {
    host: string;
    port: number;
    user: string;
    catalog: string;
    schema: string;
  } {
    if (!this.container) {
      throw new Error("Container not started or not ready");
    }

    const {
      catalog = 'memory',
      schema = 'default',
      user = this.DEFAULT_USER,
    } = options;

    return {
      host: this.container.getHost(),
      port: this.container.getMappedPort(this.DEFAULT_PORT),
      user,
      catalog,
      schema,
    };
  }

  /**
   * Create a knex instance connected to this Trino container
   */
  public getKnexInstance(options: {
    catalog?: string;
    schema?: string;
    user?: string;
  } = {}): Knex {
    if (this.knexInstance) {
      return this.knexInstance;
    }

    const connectionConfig = this.getConnectionConfig(options);

    this.knexInstance = knex({
      client: TrinoKnexClient,
      connection: connectionConfig,
    });

    return this.knexInstance;
  }

  /**
   * Initialize a schema in the memory catalog
   */
  public async initializeMemorySchema(schema = 'default'): Promise<void> {
    const knexInstance = this.getKnexInstance({
      catalog: 'memory',
      schema
    });

    await knexInstance.raw(`CREATE SCHEMA IF NOT EXISTS memory.${schema}`);
  }
}

/**
 * Helper function to get the singleton instance
 */
export const getTrinoTestContainer = (): TrinoTestContainer => {
  return TrinoTestContainer.getInstance();
};

/**
 * Function to run after all tests to clean up the container
 */
export const stopTrinoTestContainer = async (): Promise<void> => {
  await TrinoTestContainer.getInstance().stop();
};