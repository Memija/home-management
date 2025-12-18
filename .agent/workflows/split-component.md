---
description: Split Angular component into separate TS, HTML, and SCSS files
---

# Splitting Angular Components into Separate Files

When creating or refactoring Angular components, follow these steps to maintain clean separation of concerns:

## Steps

1. **Identify the component** - Locate the component file (e.g., `component-name.component.ts`)

2. **Extract the HTML template**:
   - Create a new file: `component-name.component.html`
   - Copy the entire template from the `template:` property (remove the backticks)
   - Ensure proper formatting and indentation

3. **Extract the styles**:
   - Create a new file: `component-name.component.scss`
   - Copy all styles from the `styles:` array (remove the array brackets and backticks)
   - Ensure proper SCSS formatting

4. **Update the TypeScript file**:
   - Replace `template: \`...\`` with `templateUrl: './component-name.component.html'`
   - Replace `styles: [\`...\`]` with `styleUrl: './component-name.component.scss'`
   - Keep all imports, component logic, and class definition unchanged

5. **Verify the structure**:
   - Ensure you have three files:
     - `component-name.component.ts` (TypeScript logic)
     - `component-name.component.html` (Template)
     - `component-name.component.scss` (Styles)

## Benefits

- **Better maintainability**: Each file has a single responsibility
- **Improved IDE support**: Syntax highlighting and autocomplete work better
- **Easier collaboration**: Team members can work on different aspects simultaneously
- **Cleaner version control**: Changes are more focused and easier to review

## Example

### Before (Single File)

```typescript
@Component({
  selector: 'app-example',
  template: `<div>...</div>`,
  styles: [`.example { ... }`]
})
export class ExampleComponent { }
```

### After (Split Files)

**example.component.ts:**

```typescript
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss'
})
export class ExampleComponent { }
```

**example.component.html:**

```html
<div>...</div>
```

**example.component.scss:**

```scss
.example { ... }
```

## Notes

- Always use relative paths (`./`) for `templateUrl` and `styleUrl`
- Use `styleUrl` (singular) for a single SCSS file (Angular 17+)
- Use `styleUrls` (plural, array) if you need multiple style files
- Maintain consistent naming: `component-name.component.{ts,html,scss}`
