import { describe, it, expect } from "vitest";
import { SqlServerChangeBuilder } from '@shared/lib/sql/change_builder/SqlServerChangeBuilder';

describe("SQL Server dropping columns that have a default constraint", () => {
  const defaultConstraints = [
    { name: "DF_foo_a", column: "a", schema: "dbo", table: "foo" },
    { name: "DF_foo_b", column: "b", schema: "dbo", table: "foo" },
  ]

  it("drops the default constraint before dropping the column", () => {
    const builder = new SqlServerChangeBuilder('foo', 'dbo', [], defaultConstraints)
    const result = builder.alterTable({ table: 'foo', schema: 'dbo', drops: ['a'] })
    expect(result).toBe('ALTER TABLE [dbo].[foo] DROP CONSTRAINT [DF_foo_a];ALTER TABLE [dbo].[foo] DROP COLUMN [a];')
  })

  it("does not add a DROP CONSTRAINT for a dropped column without a default", () => {
    const builder = new SqlServerChangeBuilder('foo', 'dbo', [], defaultConstraints)
    const result = builder.alterTable({ table: 'foo', schema: 'dbo', drops: ['c'] })
    expect(result).toBe('ALTER TABLE [dbo].[foo] DROP COLUMN [c];')
  })

  it("drops every default constraint, one ALTER TABLE each", () => {
    const builder = new SqlServerChangeBuilder('foo', 'dbo', [], defaultConstraints)
    const result = builder.alterTable({ table: 'foo', schema: 'dbo', drops: ['a', 'b'] })
    expect(result).toBe('ALTER TABLE [dbo].[foo] DROP CONSTRAINT [DF_foo_a];ALTER TABLE [dbo].[foo] DROP CONSTRAINT [DF_foo_b];ALTER TABLE [dbo].[foo] DROP COLUMN [a];ALTER TABLE [dbo].[foo] DROP COLUMN [b];')
  })
})
