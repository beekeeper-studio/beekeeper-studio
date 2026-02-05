You can configure the parameter sorting mode using the [config file](../user_guide/configuration.md):

```ini
[app]
; Parameter sorting mode for query parameter input modal
; Options: 'insertion' (default) or 'alphanumeric'
parameterSortMode = insertion
```

**Available options:**

- `insertion` - (Default) Displays parameters in the order they appear in your query
- `alphanumeric` - Sorts parameters with smart numeric handling (`:1`, `:2`, `:10` instead of `:1`, `:10`, `:2`)
