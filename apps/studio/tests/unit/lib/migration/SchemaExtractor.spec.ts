// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub

import { SchemaExtractor } from '@/lib/migration/SchemaExtractor';
import { IBasicDatabaseClient } from '@/lib/db/types';

describe('SchemaExtractor', () => {
  let mockClient: jest.Mocked<IBasicDatabaseClient>;
  let extractor: SchemaExtractor;

  beforeEach(() => {
    mockClient = {
      listTables: jest.fn(),
      listTableColumns: jest.fn(),
      getPrimaryKeys: jest.fn(),
      getOutgoingKeys: jest.fn(),
      listTableIndexes: jest.fn(),
      listTableTriggers: jest.fn(),
    } as any;

    extractor = new SchemaExtractor(mockClient);
  });

  describe('extractSchema', () => {
    it('should extract schema for all tables', async () => {
      mockClient.listTables.mockResolvedValue([
        { name: 'users', schema: 'public' },
        { name: 'orders', schema: 'public' }
      ]);

      mockClient.listTableColumns.mockResolvedValue([
        { columnName: 'id', dataType: 'INTEGER', nullable: false },
        { columnName: 'name', dataType: 'VARCHAR(255)', nullable: true }
      ]);

      mockClient.getPrimaryKeys.mockResolvedValue([
        { columnName: 'id' }
      ]);

      mockClient.getOutgoingKeys.mockResolvedValue([]);
      mockClient.listTableIndexes.mockResolvedValue([]);
      mockClient.listTableTriggers.mockResolvedValue([]);

      const result = await extractor.extractSchema();

      expect(result.tables).toHaveLength(2);
      expect(result.dependencies).toHaveLength(2);
      expect(mockClient.listTables).toHaveBeenCalled();
    });
  });

  describe('generateCreateTableSQL', () => {
    it('should generate basic CREATE TABLE statement', () => {
      const schema = {
        name: 'users',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR(255)', nullable: true }
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
        indexes: []
      };

      const sql = extractor.generateCreateTableSQL(schema);

      expect(sql).toContain('CREATE TABLE');
      expect(sql).toContain('`users`');
      expect(sql).toContain('`id` INTEGER NOT NULL');
      expect(sql).toContain('`name` VARCHAR(255)');
      expect(sql).toContain('PRIMARY KEY (`id`)');
    });

    it('should handle schema prefix', () => {
      const schema = {
        name: 'users',
        schema: 'public',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false }
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
        indexes: []
      };

      const sql = extractor.generateCreateTableSQL(schema);

      expect(sql).toContain('`public`.`users`');
    });
  });

  describe('generateForeignKeySQL', () => {
    it('should generate ALTER TABLE statements for foreign keys', () => {
      const schema = {
        name: 'orders',
        columns: [],
        primaryKeys: [],
        foreignKeys: [
          {
            name: 'fk_orders_users',
            columns: ['user_id'],
            referencedTable: 'users',
            referencedColumns: ['id'],
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }
        ],
        indexes: []
      };

      const sqls = extractor.generateForeignKeySQL(schema);

      expect(sqls).toHaveLength(1);
      expect(sqls[0]).toContain('ALTER TABLE `orders`');
      expect(sqls[0]).toContain('ADD CONSTRAINT `fk_orders_users`');
      expect(sqls[0]).toContain('FOREIGN KEY (`user_id`)');
      expect(sqls[0]).toContain('REFERENCES `users` (`id`)');
      expect(sqls[0]).toContain('ON UPDATE CASCADE');
      expect(sqls[0]).toContain('ON DELETE CASCADE');
    });
  });

  describe('generateIndexSQL', () => {
    it('should generate CREATE INDEX statements', () => {
      const schema = {
        name: 'users',
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
        indexes: [
          { name: 'idx_users_email', columns: ['email'], unique: true },
          { name: 'idx_users_name', columns: ['name'], unique: false }
        ]
      };

      const sqls = extractor.generateIndexSQL(schema);

      expect(sqls).toHaveLength(2);
      expect(sqls[0]).toContain('CREATE UNIQUE INDEX');
      expect(sqls[0]).toContain('`idx_users_email`');
      expect(sqls[1]).toContain('CREATE INDEX');
      expect(sqls[1]).toContain('`idx_users_name`');
    });
  });
});
