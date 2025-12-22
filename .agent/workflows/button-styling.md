---
description: How to use shared button styles in the application
---

# Shared Button Styles

This project has predefined button styles in `src/styles/_buttons.scss` that should be used consistently across all components.

## Available Button Classes

Use these CSS classes directly - they are globally available via `styles.scss`:

| Class | Color | Purpose |
|-------|-------|---------|
| `.save-btn` | Blue (#007bff) | Save/submit actions |
| `.edit-btn` | Blue (#007bff) | Edit actions |
| `.cancel-btn` | Gray (#6c757d) | Cancel/dismiss actions |
| `.export-btn` | Green (#28a745) | Export data |
| `.import-btn` | Teal (#17a2b8) | Import data |
| `.add-btn` | Green (#28a745) | Add new items |
| `.remove-btn` | Red (#dc3545) | Delete/remove actions |
| `.edit-member-btn` | Yellow (#ffc107) | Edit member actions |
| `.upload-btn` | Teal (#17a2b8) | Upload files |
| `.btn-outline` | White w/ border | Secondary/outline actions |

## Usage Guidelines

1. **DO NOT** define local `.export-btn`, `.import-btn`, or other button styles in component SCSS files
2. **DO** use the global classes directly in HTML templates
3. If you need a new button style, add it to `src/styles/_buttons.scss`
4. All buttons extend the `%btn-base` placeholder for consistent base styling

## Example Usage

```html
<button type="button" class="export-btn" (click)="exportData()">
  <lucide-icon [img]="DownloadIcon" size="16"></lucide-icon>
  Export
</button>

<label class="import-btn">
  <lucide-icon [img]="UploadIcon" size="16"></lucide-icon>
  Import
  <input type="file" class="hidden-input">
</label>
```

## Adding New Button Styles

To add a new button style:

1. Open `src/styles/_buttons.scss`
2. Create a new class that extends `%btn-base`
3. Set the appropriate background color and hover state

```scss
.my-new-btn {
  @extend %btn-base;
  background: #your-color;
  width: auto; // if it should not be full-width

  &:hover {
    background: #darker-color;
  }
}
```
