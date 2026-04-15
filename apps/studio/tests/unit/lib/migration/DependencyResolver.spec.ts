// Copyright (c) 2025 Beekeeper Studio Team

import { DependencyResolver } from '@/lib/migration/DependencyResolver';
import { TableDependency } from '@/lib/migration/types';

describe('DependencyResolver', () => {
  describe('resolveDependencies', () => {
    it('should resolve simple dependencies', () => {
      const dependencies: TableDependency[] = [
        { table: 'users', dependsOn: [] },
        { table: 'orders', dependsOn: [{ table: 'users' }] },
        { table: 'order_items', dependsOn: [{ table: 'orders' }] }
      ];

      const result = DependencyResolver.resolveDependencies(dependencies);

      expect(result).toHaveLength(3);
      expect(result[0].table).toBe('users');
      expect(result[1].table).toBe('orders');
      expect(result[2].table).toBe('order_items');
    });

    it('should handle multiple dependencies', () => {
      const dependencies: TableDependency[] = [
        { table: 'order_items', dependsOn: [{ table: 'orders' }, { table: 'products' }] },
        { table: 'orders', dependsOn: [{ table: 'users' }] },
        { table: 'products', dependsOn: [] },
        { table: 'users', dependsOn: [] }
      ];

      const result = DependencyResolver.resolveDependencies(dependencies);

      expect(result).toHaveLength(4);
      
      // Users and products can come first (no dependencies)
      const firstTwo = result.slice(0, 2).map(r => r.table).sort();
      expect(firstTwo).toEqual(['products', 'users']);
      
      // Orders must come before order_items
      const ordersIndex = result.findIndex(r => r.table === 'orders');
      const orderItemsIndex = result.findIndex(r => r.table === 'order_items');
      expect(ordersIndex).toBeLessThan(orderItemsIndex);
    });

    it('should throw error on circular dependencies', () => {
      const dependencies: TableDependency[] = [
        { table: 'a', dependsOn: [{ table: 'b' }] },
        { table: 'b', dependsOn: [{ table: 'c' }] },
        { table: 'c', dependsOn: [{ table: 'a' }] }
      ];

      expect(() => {
        DependencyResolver.resolveDependencies(dependencies);
      }).toThrow('Circular dependency detected');
    });

    it('should handle tables with no dependencies', () => {
      const dependencies: TableDependency[] = [
        { table: 'table1', dependsOn: [] },
        { table: 'table2', dependsOn: [] },
        { table: 'table3', dependsOn: [] }
      ];

      const result = DependencyResolver.resolveDependencies(dependencies);

      expect(result).toHaveLength(3);
      // Order doesn't matter when there are no dependencies
    });

    it('should handle schemas in table names', () => {
      const dependencies: TableDependency[] = [
        { table: 'users', schema: 'public', dependsOn: [] },
        { table: 'orders', schema: 'public', dependsOn: [{ table: 'users', schema: 'public' }] }
      ];

      const result = DependencyResolver.resolveDependencies(dependencies);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ table: 'users', schema: 'public' });
      expect(result[1]).toEqual({ table: 'orders', schema: 'public' });
    });
  });

  describe('groupByDependencyLevel', () => {
    it('should group tables by dependency level', () => {
      const dependencies: TableDependency[] = [
        { table: 'users', dependsOn: [] },
        { table: 'products', dependsOn: [] },
        { table: 'orders', dependsOn: [{ table: 'users' }] },
        { table: 'order_items', dependsOn: [{ table: 'orders' }, { table: 'products' }] }
      ];

      const result = DependencyResolver.groupByDependencyLevel(dependencies);

      expect(result).toHaveLength(3);
      
      // Level 0: tables with no dependencies
      expect(result[0]).toHaveLength(2);
      const level0Tables = result[0].map(t => t.table).sort();
      expect(level0Tables).toEqual(['products', 'users']);
      
      // Level 1: tables depending only on level 0
      expect(result[1]).toHaveLength(1);
      expect(result[1][0].table).toBe('orders');
      
      // Level 2: tables depending on level 1
      expect(result[2]).toHaveLength(1);
      expect(result[2][0].table).toBe('order_items');
    });

    it('should throw error on circular dependencies', () => {
      const dependencies: TableDependency[] = [
        { table: 'a', dependsOn: [{ table: 'b' }] },
        { table: 'b', dependsOn: [{ table: 'a' }] }
      ];

      expect(() => {
        DependencyResolver.groupByDependencyLevel(dependencies);
      }).toThrow('Circular dependency detected');
    });
  });
});
