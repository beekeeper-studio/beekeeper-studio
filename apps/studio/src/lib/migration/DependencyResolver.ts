// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub
// Topological sort for table dependency resolution

import { TableDependency } from './types';

export class DependencyResolver {
  /**
   * Resolves table dependencies using topological sort (Kahn's algorithm)
   * Returns tables in the order they should be migrated
   * @param dependencies Array of table dependencies
   * @returns Ordered array of tables
   * @throws Error if circular dependency is detected
   */
  static resolveDependencies(dependencies: TableDependency[]): Array<{ table: string; schema?: string }> {
    // Build adjacency list and in-degree map
    const adjacencyList = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();
    const tableMap = new Map<string, { table: string; schema?: string }>();

    // Initialize maps
    for (const dep of dependencies) {
      const tableKey = this.getTableKey(dep.table, dep.schema);
      tableMap.set(tableKey, { table: dep.table, schema: dep.schema });
      
      if (!adjacencyList.has(tableKey)) {
        adjacencyList.set(tableKey, new Set());
        inDegree.set(tableKey, 0);
      }

      // Add dependencies
      for (const dependency of dep.dependsOn) {
        const depKey = this.getTableKey(dependency.table, dependency.schema);
        
        if (!tableMap.has(depKey)) {
          tableMap.set(depKey, { table: dependency.table, schema: dependency.schema });
        }
        
        if (!adjacencyList.has(depKey)) {
          adjacencyList.set(depKey, new Set());
          inDegree.set(depKey, 0);
        }

        // Add edge from dependency to dependent
        if (!adjacencyList.get(depKey)!.has(tableKey)) {
          adjacencyList.get(depKey)!.add(tableKey);
          inDegree.set(tableKey, (inDegree.get(tableKey) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    const result: Array<{ table: string; schema?: string }> = [];

    // Start with tables that have no dependencies
    for (const [tableKey, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(tableKey);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(tableMap.get(current)!);

      // Process all tables that depend on current table
      const dependents = adjacencyList.get(current) || new Set();
      for (const dependent of dependents) {
        inDegree.set(dependent, inDegree.get(dependent)! - 1);
        
        if (inDegree.get(dependent) === 0) {
          queue.push(dependent);
        }
      }
    }

    // Check for circular dependencies
    if (result.length !== tableMap.size) {
      const remaining = Array.from(tableMap.keys()).filter(key => !result.find(r => this.getTableKey(r.table, r.schema) === key));
      throw new Error(`Circular dependency detected in tables: ${remaining.join(', ')}`);
    }

    return result;
  }

  /**
   * Generates a unique key for a table
   */
  private static getTableKey(table: string, schema?: string): string {
    return schema ? `${schema}.${table}` : table;
  }

  /**
   * Groups tables by dependency level (0 = no dependencies, 1 = depends on level 0, etc.)
   * This allows for parallel migration within each level
   */
  static groupByDependencyLevel(dependencies: TableDependency[]): Array<Array<{ table: string; schema?: string }>> {
    const adjacencyList = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();
    const tableMap = new Map<string, { table: string; schema?: string }>();

    // Initialize maps
    for (const dep of dependencies) {
      const tableKey = this.getTableKey(dep.table, dep.schema);
      tableMap.set(tableKey, { table: dep.table, schema: dep.schema });
      
      if (!inDegree.has(tableKey)) {
        inDegree.set(tableKey, 0);
      }

      for (const dependency of dep.dependsOn) {
        const depKey = this.getTableKey(dependency.table, dependency.schema);
        
        if (!tableMap.has(depKey)) {
          tableMap.set(depKey, { table: dependency.table, schema: dependency.schema });
        }
        
        if (!adjacencyList.has(depKey)) {
          adjacencyList.set(depKey, new Set());
        }
        
        if (!inDegree.has(depKey)) {
          inDegree.set(depKey, 0);
        }

        if (!adjacencyList.get(depKey)!.has(tableKey)) {
          adjacencyList.get(depKey)!.add(tableKey);
          inDegree.set(tableKey, (inDegree.get(tableKey) || 0) + 1);
        }
      }
    }

    const levels: Array<Array<{ table: string; schema?: string }>> = [];
    const processed = new Set<string>();

    while (processed.size < tableMap.size) {
      const currentLevel: Array<{ table: string; schema?: string }> = [];

      // Find all tables with no remaining dependencies
      for (const [tableKey, degree] of inDegree.entries()) {
        if (degree === 0 && !processed.has(tableKey)) {
          currentLevel.push(tableMap.get(tableKey)!);
          processed.add(tableKey);
        }
      }

      if (currentLevel.length === 0) {
        throw new Error('Circular dependency detected');
      }

      levels.push(currentLevel);

      // Reduce in-degree for dependent tables
      for (const table of currentLevel) {
        const tableKey = this.getTableKey(table.table, table.schema);
        const dependents = adjacencyList.get(tableKey) || new Set();
        
        for (const dependent of dependents) {
          inDegree.set(dependent, inDegree.get(dependent)! - 1);
        }
      }
    }

    return levels;
  }
}
