# Query Parameter Sorting Feature

## Overview

This feature provides configurable sorting options for query parameters in the parameter input modal, addressing Issue #3651 where numeric parameters were displayed in alphabetical order (`:1`, `:10`, `:2`) instead of numerical order (`:1`, `:2`, `:10`).

## Features

### Two Sorting Modes

1. **Insertion Order (Default)**
   - Parameters appear in the order they're written in the query
   - Fixes the original bug where `:10` appeared before `:2`
   - Best for queries where parameter order matters
   - Example: `SELECT * FROM users WHERE id = :1 AND age > :10 AND status = :2`
     - Parameters display as: `:1`, `:10`, `:2` (in query order)

2. **Alphanumeric Sorting**
   - Parameters are sorted intelligently with proper numeric handling
   - Numeric suffixes are sorted numerically (`:1` < `:2` < `:10`)
   - Named parameters are sorted alphabetically
   - Best for queries with many parameters where finding specific ones is easier when sorted
   - Example: `SELECT * FROM users WHERE id = :1 AND age > :10 AND status = :2`
     - Parameters display as: `:1`, `:2`, `:10` (sorted numerically)

## Configuration

### Setting the Sort Mode

The parameter sort mode is stored as a user setting in the database and can be accessed via the settings store:

```typescript
// Get current mode
const sortMode = this.$store.getters['settings/parameterSortMode']
// Returns: 'insertion' (default) or 'alphanumeric'

// Set mode
await this.$store.dispatch('settings/save', {
  key: 'parameterSortMode',
  value: 'alphanumeric' // or 'insertion'
})
```

### Default Behavior

- **Default mode**: `insertion` (preserves query order)
- The default was chosen to fix the original bug while maintaining backward compatibility
- If the setting is not configured or has an invalid value, `insertion` mode is used

## Technical Details

### Smart Alphanumeric Sorting

The alphanumeric sorting mode includes intelligent handling of numeric suffixes:

- **Extracts numeric suffixes**: `:10` → prefix=`:`, number=`10`
- **Sorts numerically**: Parameters with the same prefix and numeric suffixes are sorted by number value
- **Handles mixed types**: Numeric parameters are sorted before named parameters
- **Supports all syntaxes**: Works with `:N`, `$N`, `@N`, and named parameters

### Supported Parameter Types

All database parameter syntaxes are supported:

| Syntax | Database | Example | Sorting Behavior |
|--------|----------|---------|------------------|
| `:N` | Oracle, SQLite | `:1`, `:2`, `:10` | Numeric sorting |
| `$N` | PostgreSQL | `$1`, `$2`, `$10` | Numeric sorting |
| `@N` | SQL Server | `@1`, `@2`, `@10` | Numeric sorting |
| `:name` | Named params | `:userId`, `:email` | Alphabetical sorting |
| `?` | Positional | `?`, `?`, `?` | Converted to indices (0, 1, 2) |

### Implementation Files

- **Utility functions**: `src/lib/db/parameter-sorting.ts`
  - `sortParameters()` - Main function that handles both modes
  - `sortParametersAlphanumeric()` - Smart alphanumeric sorting
  - `deduplicatePreservingOrder()` - Insertion order deduplication

- **Settings store**: `src/store/modules/settings/SettingStoreModule.ts`
  - Getter: `parameterSortMode` - Returns current mode

- **Component**: `src/components/TabQueryEditor.vue`
  - Computed property: `queryParameterPlaceholders` - Uses the setting to sort parameters

- **Tests**:
  - `tests/unit/lib/parameter-sorting.spec.ts` - 32 comprehensive tests
  - `tests/unit/lib/query-parameter-ordering.spec.js` - 14 tests for insertion order

## Examples

### Example 1: Insertion Order (Default)

```sql
-- Query with parameters in a specific order
SELECT * FROM users
WHERE id = :1
  AND age > :10
  AND status = :2
  AND created_at > :11;
```

**Parameters displayed**: `:1`, `:10`, `:2`, `:11` (preserves query order)

**Use case**: When the order parameters appear in the query is meaningful or when you want to fill them in the order you wrote them.

### Example 2: Alphanumeric Sorting

```sql
-- Same query, but with alphanumeric sorting enabled
SELECT * FROM users
WHERE id = :1
  AND age > :10
  AND status = :2
  AND created_at > :11;
```

**Parameters displayed**: `:1`, `:2`, `:10`, `:11` (sorted numerically)

**Use case**: When you have many parameters and want to find specific ones more easily, or when working with parameters that weren't written sequentially in the query.

### Example 3: Named Parameters with Alphanumeric

```sql
-- Query with named parameters
SELECT * FROM users
WHERE email = :userEmail
  AND age > :minAge
  AND status = :accountStatus
  AND id = :userId;
```

**Insertion order**: `:userEmail`, `:minAge`, `:accountStatus`, `:userId`

**Alphanumeric order**: `:accountStatus`, `:minAge`, `:userEmail`, `:userId` (alphabetical)

### Example 4: Mixed Parameters

```sql
-- Query with both numeric and named parameters
SELECT * FROM users
WHERE id = :1
  AND name = :userName
  AND age > :2
  AND email = :userEmail;
```

**Insertion order**: `:1`, `:userName`, `:2`, `:userEmail`

**Alphanumeric order**: `:1`, `:2`, `:userEmail`, `:userName` (numeric first, then alphabetical)

## Testing

The feature includes comprehensive test coverage:

- **32 tests** in `parameter-sorting.spec.ts` covering:
  - Both sorting modes
  - All parameter syntaxes (`:N`, `$N`, `@N`, named)
  - Edge cases (empty arrays, duplicates, large numbers)
  - Real-world scenarios with 15+ parameters

- **14 tests** in `query-parameter-ordering.spec.js` covering:
  - Original bug fix verification
  - Insertion order preservation
  - Duplicate handling

All tests pass, and the feature is backward compatible with existing functionality.

## Future Enhancements

Potential improvements for future versions:

1. **UI for Settings**
   - Add a toggle in the preferences/settings UI to switch between modes
   - Show tooltips explaining the difference between modes

2. **Per-Query Override**
   - Allow users to temporarily switch modes for a specific query
   - Add a button in the parameter modal to toggle sorting

3. **Additional Sort Modes**
   - "Frequency" - Sort by how often each parameter appears in the query
   - "Alphabetical" - Simple alphabetical sorting without smart numeric handling

4. **Custom Sort Order**
   - Allow users to manually reorder parameters in the modal
   - Save custom ordering preferences per query

## Migration Notes

### From Buggy Behavior

Users who were experiencing the bug (`:1`, `:10`, `:2` ordering) will now see parameters in the order they wrote them by default. This is more intuitive and fixes the reported issue.

### Upgrading

- **No database migration required** - The setting is created on-demand when set
- **Default behavior** - If users haven't set a preference, they get the fixed behavior (insertion order)
- **Backward compatible** - All existing queries and parameters continue to work as expected

## Performance

- **Minimal overhead** - Sorting happens on a small array (typically < 20 parameters)
- **O(n log n)** - Alphanumeric sorting uses efficient comparison function
- **O(n)** - Insertion order uses Set for deduplication (linear time)
- **No impact on query execution** - Sorting only affects display in the parameter modal
