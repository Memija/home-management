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

```
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
