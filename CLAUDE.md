# Coding Principles & Guidelines

## DRY Principle (Don't Repeat Yourself)

**CRITICAL RULE:** Before writing ANY new code, you MUST check if similar functionality already exists in the codebase.

### Pre-Implementation Checklist

Before creating new components, functions, or code blocks, complete this checklist:

- [ ] **Search for existing implementations** - Use grep/codebase search to find similar functionality
- [ ] **Check shared components** - Look in `src/app/shared/` for reusable components
- [ ] **Review services** - Check if a service already provides similar functionality
- [ ] **Examine utilities** - Look for helper functions that could be extended
- [ ] **Consider abstraction** - If duplicating code, create a shared abstraction instead

### Decision Tree for New Code

```text
Need to implement feature X?
│
├─ Does similar code exist? 
│  ├─ YES → Can it be reused as-is?
│  │         ├─ YES → Use it! ✓
│  │         └─ NO → Can it be extended/modified?
│  │                   ├─ YES → Extend it! ✓
│  │                   └─ NO → Create abstraction, extract common parts
│  └─ NO → Is this likely to be used elsewhere?
│            ├─ YES → Create it in shared location
│            └─ NO → Create it component-specific, but keep it modular
```

### Examples of Code Reuse Opportunities

#### ✅ GOOD - Identified and Extracted

- **Deletion Modal** - Was duplicated in water and family components → Extracted to `delete-confirmation-modal` shared component

#### ❌ BAD - Code Duplication to Avoid

- Copying modal markup into multiple components
- Duplicating validation logic across forms
- Repeating API call patterns
- Copy-pasting styling rules

### Shared Component Locations

When creating reusable components, place them in:

- **`src/app/shared/`** - For UI components used across multiple features
- **`src/app/services/`** - For shared business logic and data access
- **`src/app/pipes/`** - For shared data transformation logic
- **`src/app/models/`** or **`src/app/interfaces/`** - For shared type definitions

### Refactoring Triggers

If you notice ANY of these, stop and refactor:

1. **Copying code** from one component to another
2. **Similar logic** in 2+ places
3. **Identical markup** in multiple templates
4. **Repeated patterns** in styling
5. **Duplicate validation** or data transformation

### Code Review Questions

Before committing new code, ask:

1. Does this code already exist somewhere?
2. Could this be useful in other parts of the application?
3. Is there a more general solution that would work here?
4. Can I extract common functionality into a shared location?
5. Am I introducing technical debt by duplicating this?

## Implementation Guidelines

### When Creating Shared Components

**Must have:**

- Clear, descriptive name reflecting its purpose
- Documented inputs and outputs (via comments or README)
- Flexible enough for multiple use cases
- Proper TypeScript typing
- Standalone (if using Angular standalone components)

**Example Structure:**

```typescript
@Component({
  selector: 'app-reusable-thing',
  standalone: true,
  // ... configuration
})
export class ReusableThingComponent {
  // Inputs for customization
  @Input() config!: SomeConfig;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  
  // Outputs for parent communication
  @Output() actionCompleted = new EventEmitter<void>();
  
  // ... implementation
}
```

### When Extending Services

Prefer:

- Adding methods to existing services over creating new ones
- Using dependency injection for shared functionality
- Creating base classes or composition for shared behavior

### Code Organization Priority

1. **Reuse existing** code
2. **Extend/modify** existing code to be more flexible
3. **Extract common** patterns into shared utilities
4. **Create new** code only when necessary
5. **Document** for future reuse

## Automation Reminders

- Always run `grep` or `codebase_search` before creating new functionality
- Check `src/app/shared/` directory contents before creating components
- Use `view_file_outline` to understand existing component structure
- Search for similar translation keys before creating new ones

## Project-Specific Patterns

### This Project Uses

- **Angular Signals** for reactive state management
- **Standalone components** (no NgModules)
- **Lucide Angular** for icons
- **TranslatePipe** for i18n

### Common Reusable Patterns to Use

- Modal components with configurable content
- Form input components with validation
- Data display components with sorting/filtering
- Service methods for CRUD operations

## File Size & Component Extraction

### Keep Files Small and Focused

**CRITICAL RULE:** Large files are hard to maintain, test, and understand. Extract functionality early and often.

#### File Size Guidelines

- **Components (TypeScript):** Target < 300 lines, max 500 lines
- **Templates (HTML):** Target < 200 lines, max 300 lines  
- **Stylesheets (SCSS):** Target < 300 lines, max 500 lines
- **Services:** Target < 400 lines, max 600 lines

#### When to Extract

Extract to a new component/service when:

1. **File exceeds target size** - Don't wait for max size
2. **Distinct sections** - Code has clear, separable responsibilities
3. **Reusability potential** - Section could be used elsewhere
4. **Testing complexity** - Too many test cases for one file
5. **Multiple concerns** - Component handles more than one main purpose

#### Extraction Checklist

Before extracting code:

- [ ] **Identify boundaries** - Find natural separation points
- [ ] **Name clearly** - New component should have descriptive, focused name
- [ ] **Define interface** - Inputs and outputs should be minimal and clear
- [ ] **Move related code** - Include all related logic, styles, and templates
- [ ] **Update tests** - Create tests for new component
- [ ] **Verify functionality** - Ensure everything works after extraction

#### Example: Detailed Records Extraction

Good example from this project:

**Before:** Water component was 520 lines with records display, filtering, sorting, pagination, chart logic, and data management.

**After:**

- Water component: ~260 lines (chart + data management)
- Detailed records component: ~200 lines (display + filtering + pagination)

**Benefits:**

- Each component has single responsibility
- Detailed records component is reusable across water, home, heating
- Easier to test and maintain
- Clearer code organization

#### Component Extraction Priority

1. **UI sections** that are self-contained (modals, lists, forms)
2. **Repeated markup** across multiple components
3. **Complex logic** that can be isolated (filtering, sorting, validation)
4. **Feature-specific code** that might grow (wizards, multi-step forms)

### Naming Extracted Components

Use descriptive names that reflect single responsibility:

✅ **Good:** `detailed-records`, `delete-confirmation-modal`, `consumption-input`
❌ **Bad:** `records`, `modal`, `input` (too generic)
❌ **Bad:** `water-records-list-with-filters` (too specific, should be generic)

---

**Remember:** Every line of duplicated code is a future maintenance burden. Code reuse isn't just about reducing lines—it's about creating a maintainable, consistent, and scalable codebase.

---

## Error Handling

**CRITICAL:** Never let errors fail silently.

- **Always handle async errors** - Use try/catch for promises and async operations
- **Log errors meaningfully** - Technical details to console, user-friendly messages in UI
- **Reset UI state on error** - Clear loading states, re-enable buttons, reset file inputs
- **Provide actionable feedback** - Tell users what went wrong and how to fix it

### Error Handling Pattern

```typescript
async handleAction() {
  try {
    this.isLoading.set(true);
    await this.service.doSomething();
    this.showSuccess();
  } catch (error) {
    console.error('Action failed:', error);
    this.showError('Failed to complete action. Please try again.');
  } finally {
    this.isLoading.set(false);
  }
}
```

---

## Naming Conventions

Consistent naming improves readability and searchability.

| Type | Convention | Example |
| ---- | ---------- | ------- |
| Files | kebab-case | `user-profile.component.ts` |
| Classes/Components | PascalCase | `UserProfileComponent` |
| Methods/Variables | camelCase | `getUserProfile`, `isLoading` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE`, `API_URL` |
| Signals | Noun-based | `isLoading`, `userData` |
| Booleans | Prefix with `is`, `has`, `can`, `should` | `isValid`, `hasChanges` |

---

## Code Quality

### Must Avoid

- ❌ **No `console.log` in production** - Remove or use proper logging
- ❌ **No commented-out code** - Delete it; git has history
- ❌ **No `any` type** - Always define proper types/interfaces
- ❌ **No magic numbers** - Extract to named constants
- ❌ **No deep nesting** - Max 3 levels; extract to functions

### Must Follow

- ✅ **Single Responsibility** - One function does one thing
- ✅ **Early returns** - Reduce nesting with guard clauses
- ✅ **Descriptive names** - Code should read like prose
- ✅ **Small functions** - Target < 30 lines per function

---

## Accessibility (A11y)

**CRITICAL:** Accessibility is not optional.

- **All buttons must have discernible text** - Use `title`, `aria-label`, or visible text
- **All images must have `alt` attributes** - Empty string for decorative images
- **All form inputs must have labels** - Use `<label for="">` or `aria-label`
- **Interactive elements must be keyboard accessible** - Tab navigation must work
- **Color is not the only indicator** - Use icons/text alongside color

### Quick Check

```html
<!-- ❌ BAD -->
<button (click)="close()"><lucide-icon [img]="XIcon"></lucide-icon></button>

<!-- ✅ GOOD -->
<button (click)="close()" title="Close" aria-label="Close modal">
  <lucide-icon [img]="XIcon"></lucide-icon>
</button>
```

---

## Performance

### Lazy Loading

- **Lazy load routes** - Don't load modules until needed
- **Dynamic imports** - Load heavy libraries on demand (e.g., chart.js, xlsx)

### Angular-Specific

- **Use `trackBy` with `*ngFor`** - Prevents unnecessary DOM re-renders
- **Avoid function calls in templates** - Use computed signals or pipes
- **Use `OnPush` change detection** where appropriate

### General

- **Minimize bundle size** - Check for duplicate imports
- **Optimize images** - Use WebP, lazy load below-fold images
- **Debounce user input** - Don't fire on every keystroke

### Memory Management

- **Unsubscribe from observables** - Use `takeUntilDestroyed()` or `async` pipe
- **Clean up event listeners** - Remove in `ngOnDestroy`
- **Avoid memory leaks in effects** - Be careful with closures capturing large objects

### Rendering Performance

- **Use `@defer` blocks** - Defer non-critical UI rendering until needed
- **Virtual scrolling** - For long lists (100+ items), use CDK virtual scroll
- **Avoid layout thrashing** - Batch DOM reads and writes separately

### Data Handling

- **Paginate large datasets** - Don't load thousands of records at once
- **Cache computed values** - Use `computed()` signals, not repeated calculations
- **Use `structuredClone()` for deep copies** - Faster than `JSON.parse(JSON.stringify())`
- **Avoid unnecessary object creation** - Reuse objects in loops where possible

---

## Angular Best Practices

### Signals & Reactivity

- **Prefer signals over BehaviorSubject** for component state
- **Use `computed()` for derived state** - Don't recalculate in templates
- **Use `effect()` sparingly** - Only for side effects, not for setting state

### Component Architecture

- **Standalone components only** - No NgModules
- **Split large components** - Separate `.ts`, `.html`, `.scss` files (use `/split-component` workflow)
- **Use `input()` and `output()`** - New signal-based inputs/outputs preferred
- **Inject services with `inject()`** - Not constructor injection

### Template Rules

- **No complex logic in templates** - Use computed signals or methods
- **Use `@if` and `@for`** - New control flow syntax preferred over `*ngIf/*ngFor`
- **Always use `track` with `@for` loops** - `@for (item of items; track item.id)`

### Service Guidelines

- **Services are `providedIn: 'root'`** unless scoped to a specific component
- **Use `LocalStorageService`** - Not direct `localStorage` access
- **Async methods return `Promise<T>`** - Use async/await pattern

---

## TypeScript Best Practices

### Type Safety

- **Never use `any`** - Use `unknown` if type is truly unknown, then narrow
- **Define interfaces for all data structures** - Place in `models/` folder
- **Use type guards** for runtime type checking
- **Prefer `readonly` for immutable data**

### Modern Syntax

```typescript
// ✅ GOOD - Modern syntax
const name = user?.profile?.name ?? 'Anonymous';
const message = `Hello, ${name}!`;

// ❌ BAD - Legacy patterns
const name = user && user.profile && user.profile.name || 'Anonymous';
const message = 'Hello, ' + name + '!';
```

### Functions

- **Type all parameters and return values**
- **Use arrow functions** for callbacks and short functions
- **Avoid default exports** - Use named exports for better refactoring
- **Keep functions small** - Max ~30 lines

---

## SCSS Best Practices

### Global Styles Architecture

```text
src/styles/
├── _variables.scss    # Colors, spacing, typography
├── _buttons.scss      # Button styles
├── _forms.scss        # Form inputs, labels
├── _modal.scss        # Modal overlay, content
├── _layout.scss       # Grid, containers
└── styles.scss        # Main entry, imports all partials
```

### Rules

- **Use global partials** - `_buttons.scss`, `_modal.scss`, `_forms.scss`
- **Don't duplicate global styles in components** - Import or rely on cascade
- **Component SCSS = overrides only** - Base styles come from globals
- **Use nesting sparingly** - Max 3 levels deep

### Variables

```scss
// Define in _variables.scss
$primary-color: #007bff;
$danger-color: #dc2626;
$success-color: #10b981;
$border-radius: 8px;
$transition-fast: 0.2s ease;

// Use everywhere
.button {
  background: $primary-color;
  border-radius: $border-radius;
  transition: all $transition-fast;
}
```

### Avoid

- ❌ Hardcoded colors (`#007bff` repeated everywhere)
- ❌ Deep nesting (`.a { .b { .c { .d { } } } }`)
- ❌ `!important` (fix specificity instead)
- ❌ Duplicating animations defined in globals

---

## Security Best Practices

### Input Validation

- **Validate all user input** - Check types, ranges, and formats before processing
- **Sanitize imported data** - Never trust external files (JSON, Excel) without validation
- **Use Angular's built-in sanitization** - Don't bypass with `bypassSecurityTrustHtml()` unless absolutely necessary

### Storage Security

- **Don't store sensitive data in localStorage** - It's accessible to any script on the page
- **No passwords, tokens, or PII in client storage**
- **Consider data expiry** - Provide ways for users to clear old data

### Code Security

- **No secrets in code** - No API keys, passwords, or tokens in source files
- **No `eval()` or `new Function()`** - Never execute dynamic code
- **Avoid `innerHTML`** - Use Angular bindings; if needed, sanitize first
- **Keep dependencies updated** - Run `npm audit` regularly to check for vulnerabilities

### File Handling

- **Validate file types** - Check MIME type and extension before processing
- **Limit file sizes** - Prevent memory exhaustion from large uploads
- **Don't execute uploaded content** - Treat all file imports as untrusted data

### Angular-Specific Security

- **Use `HttpClient`** for API calls - It handles XSRF protection automatically
- **Don't disable Angular's sanitizer** without a documented security review
- **Enable strict mode** in `tsconfig.json` - Catches potential issues at compile time

---

## Resilience Best Practices

### Graceful Degradation

- **App should work even if features fail** - One broken feature shouldn't crash the whole app
- **Provide fallback values** - Default to safe values when data is missing
- **Handle missing/corrupt localStorage gracefully** - App should initialize even if storage is corrupted

### Error Recovery

- **Retry failed operations** - Especially for file operations or async tasks
- **Allow users to retry** - Provide "Try Again" buttons after failures
- **Preserve user input on error** - Don't clear forms when submission fails
- **Auto-save drafts** - Prevent data loss from browser crashes

### Data Integrity

- **Validate data on load** - Check structure before using stored data
- **Handle schema migrations** - Old data formats should upgrade gracefully
- **Provide data export** - Users should be able to backup their data
- **Confirm destructive actions** - Always ask before deleting

### Defensive Coding

- **Check for null/undefined** - Use optional chaining (`?.`) and nullish coalescing (`??`)
- **Provide sensible defaults** - `value ?? defaultValue`
- **Array safety** - Check `.length` before accessing indices
- **Assume external data is malformed** - Validate everything from files/APIs

---

## Testing

### What to Test

- **Critical user flows** - Data entry, save, delete, export/import
- **Edge cases** - Empty states, max values, invalid input
- **Error paths** - Network failures, invalid data, permission issues

### What NOT to Test

- **Framework code** - Don't test Angular's built-in functionality
- **Trivial getters/setters** - No value in testing `return this.value`
- **Implementation details** - Test behavior, not internal methods

### Test Naming

```typescript
// Pattern: should_ExpectedBehavior_When_Condition
it('should display error message when form is invalid', () => {});
it('should save record when all fields are valid', () => {});
it('should disable submit button when loading', () => {});
```

### Testing Best Practices

- **One assertion per test** where practical
- **Arrange-Act-Assert** pattern
- **Use descriptive test names** - They serve as documentation
- **Mock external dependencies** - Services, localStorage, etc.

---

## Documentation

### When to Comment

- ✅ **Complex algorithms** - Explain the "why" not the "what"
- ✅ **Workarounds** - Document why a hack was necessary
- ✅ **Public APIs** - JSDoc for methods others will call
- ❌ **Obvious code** - Don't comment `// increment counter` above `i++`

### JSDoc Standards

```typescript
/**
 * Calculates daily water consumption per person.
 * @param totalLiters - Total water consumed
 * @param familySize - Number of household members
 * @returns Liters per person per day, or 0 if familySize is 0
 */
calculatePerPerson(totalLiters: number, familySize: number): number {
  return familySize > 0 ? totalLiters / familySize : 0;
}
```

### README Requirements

- **What the project does** - Brief description
- **How to run it** - `npm install`, `npm start`
- **Project structure** - Overview of folder organization
- **Key decisions** - Architecture choices, technology rationale

---

## Git & Version Control

### Commit Messages

```text
<type>: <short summary>

<optional body>
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code change that neither fixes nor adds
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `chore:` - Build, dependencies, config

**Examples:**

```text
feat: add Excel import for water consumption
fix: correct date parsing for German locale
refactor: extract modal styles to _modal.scss
```

### Branch Naming

- `feature/add-heating-chart`
- `fix/excel-import-error`
- `refactor/consolidate-modals`

### Git Best Practices

- **Commit often** - Small, atomic commits
- **Write meaningful messages** - Future you will thank you
- **Don't commit commented-out code** - Delete it
- **Review before pushing** - `git diff` is your friend

---

## Internationalization (i18n)

### Translation Keys

```typescript
// ✅ GOOD - Hierarchical, descriptive
'WATER.CHART.TITLE'
'SETTINGS.FAMILY.ADD_MEMBER'
'ERRORS.IMPORT.INVALID_FORMAT'

// ❌ BAD - Flat, cryptic
'title1'
'btn_add'
'err_msg'
```

### Translation Rules

- **Never hardcode user-facing strings** - Use translation keys
- **Use interpolation** for dynamic values: `{{ 'GREETING' | translate:{ name: userName } }}`
- **Provide context in keys** - `BUTTON.SAVE` vs `MODAL.SAVE` if different
- **Keep translations in sync** - Update all language files together

### Date/Number Formatting

- **Use locale-aware pipes** - `{{ date | date:'shortDate' }}`
- **Don't assume date formats** - `MM/DD/YYYY` is US only
- **Respect decimal separators** - Some locales use `,` instead of `.`

---

## Logging & Debugging

### When to Log

- ✅ **Errors** - Always log with context
- ✅ **Important state changes** - Data loaded, user actions
- ✅ **Integration points** - File imports, external data
- ❌ **Every function call** - Creates noise, hurts performance

### Log Levels

```typescript
console.error('Critical failure:', error);  // Errors that break functionality
console.warn('Deprecated usage:', detail);  // Warnings, deprecations
console.info('Data loaded:', summary);      // Important info (dev only)
// console.log - Remove before commit!
```

### Logging Best Practices

- **Include context** - What was happening when it failed?
- **Remove debug logs** before committing
- **Use structured messages** - `{ action: 'import', file: filename, error }`
- **Don't log sensitive data** - No passwords, tokens, PII

---

## Project Structure

### Folder Organization

```text
src/app/
├── components/         # Reusable UI components (language-switcher)
├── models/             # TypeScript interfaces and types
├── pipes/              # Custom Angular pipes
├── services/           # Business logic and data access
├── shared/             # Shared components (modals, inputs, charts)
├── settings/           # Settings feature module
├── water/              # Water tracking feature
├── heating/            # Heating tracking feature
└── home/               # Home/dashboard feature

src/styles/
├── _variables.scss     # Colors, spacing, typography
├── _buttons.scss       # Button styles
├── _forms.scss         # Form inputs
├── _modal.scss         # Modal styles
├── _layout.scss        # Grid, containers
└── styles.scss         # Main entry point
```

### Guidelines

- **Feature-based structure** - Group by feature, not by type
- **Shared code in `shared/`** - Components used across features
- **Services in `services/`** - All injectable services
- **Models in `models/`** - Shared interfaces and types
- **One component per folder** - Keep `.ts`, `.html`, `.scss` together

---

## Dependency Management

### Before Adding a Package

- **Do we really need it?** - Can we build it ourselves in < 1 hour?
- **Check bundle size** - Use [bundlephobia.com](https://bundlephobia.com) to see impact
- **Check maintenance** - Last update, open issues, download count
- **Check license** - MIT/Apache preferred, avoid GPL for commercial use

### Dependency Rules

- **Prefer peer dependencies** - Avoid version conflicts
- **Pin major versions** - `^18.0.0` not `*`
- **Run `npm audit` regularly** - Fix security vulnerabilities
- **Update dependencies monthly** - Don't let them get stale

### Heavy Libraries

Load on demand, not at startup:

```typescript
// ✅ GOOD - Dynamic import
const xlsx = await import('xlsx');

// ❌ BAD - Static import (always in bundle)
import * as xlsx from 'xlsx';
```

---

## Browser Compatibility

### Target Browsers

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)  
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Safari Gotchas

Safari has quirks. Watch out for:

- **`user-select`** - Needs `-webkit-user-select` prefix
- **Date parsing** - Use `new Date('2024-01-15')` not `new Date('01/15/2024')`
- **Flexbox gaps** - Use `margin` fallbacks for older Safari
- **IndexedDB** - Needs polyfills for older versions

### Browser Best Practices

- **Test on Safari** - Most unique bugs appear here
- **Use feature detection** - Not browser sniffing
- **Check CSS prefixes** - Use autoprefixer in build
- **Don't assume APIs exist** - Check before using

---

## State Management

### When to Use What

| State Type | Solution | Example |
| ---------- | -------- | ------- |
| Component UI state | `signal()` | `isLoading`, `isOpen` |
| Shared across components | Service with signals | `HouseholdService.members()` |
| User preferences | `LocalStorageService` | Chart view, language |
| Derived data | `computed()` | Filtered lists, totals |

### State Management Rules

- **Prefer signals** over BehaviorSubject for new code
- **Single source of truth** - Don't duplicate state
- **Keep state minimal** - Derive what you can
- **Colocate state** - Keep it close to where it's used

### Anti-Patterns

- ❌ Storing derived data (calculate it instead)
- ❌ Prop drilling through many levels (use a service)
- ❌ Mutating state directly (use `.set()` or `.update()`)
- ❌ Global state for component-specific data

---

## UX Patterns

### Loading States

Always show loading feedback:

```html
@if (isLoading()) {
  <div class="loading-spinner">Loading...</div>
} @else {
  <div class="content">{{ data() }}</div>
}
```

### Empty States

Never show blank screens:

```html
@if (records().length === 0) {
  <div class="empty-state">
    <lucide-icon [img]="DropletIcon"></lucide-icon>
    <p>No water consumption records yet.</p>
    <button (click)="addFirst()">Add your first record</button>
  </div>
}
```

### Feedback After Actions

- ✅ Show success message after save
- ✅ Show error message on failure
- ✅ Disable buttons while processing
- ✅ Re-enable buttons after completion

### Confirmation for Destructive Actions

Always confirm before:

- Deleting data
- Overwriting imports
- Clearing all records

Use `delete-confirmation-modal` or `confirmation-modal` components.
