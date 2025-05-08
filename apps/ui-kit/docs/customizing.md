# Customizing UI Kit Components

## Styling Components

The UI Kit components can be styled using regular CSS. Since CSS variables are not yet extensively implemented, you should use regular CSS selectors to customize component appearances:

```css
/* General component styling */
.BksTable {
  background-color: white;
  --bks-table-header-bg-color: #ffffff;
}

.BksSqlTextEditor {
  background-color: #fafafa;
}

.BksEntityList .entity-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
```

## Theming Process

1. Import the default styles:
   ```js
   import "@beekeeperstudio/ui-kit/style.css";
   ```

2. Add your custom CSS either in a separate stylesheet or use your framework's styling system.

3. Target specific component classes for customization.

## Key Component Classes

- `.BksTable` - Table component
- `.BksSqlTextEditor` - SQL text editor component
- `.BksEntityList` - Entity list component
- `.BksDataEditor` - Data editor component

## Icon Limitations

Currently, the UI Kit doesn't support icon customization. The icons are built into the html and cannot be changed through CSS or props.

