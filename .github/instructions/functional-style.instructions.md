---
applyTo: "src/**"
---

# Functional Code Style

This project uses a **functions-only** code style. Do not use classes.

## Rules

- **No classes**: Never use `class` declarations. Use plain functions, closures, and objects instead.
- **Named exports**: Export functions directly — `export function parseFrontmatter(...)` or `export const parseFrontmatter = (...)`.
- **Pure functions first**: Prefer pure functions (no side effects, deterministic output). Isolate I/O at the edges.
- **Composition over inheritance**: Combine small functions via composition. Use higher-order functions when reuse is needed.
- **Typed function signatures**: Always type parameters and return types explicitly.
- **No `this`**: Never rely on `this` binding. Pass dependencies as arguments or use closures.
- **Object literals for config/state**: When grouping related data, use plain typed objects or interfaces — not class instances.

## Patterns

### Module as a namespace

```ts
// converters/copilot.ts
export function generate(config: AniversizeConfig): string { ... }
export function validate(config: AniversizeConfig): ValidationResult { ... }
```

### Factory functions instead of constructors

```ts
// Instead of: class Parser { constructor(opts) { ... } }
export function createParser(opts: ParserOptions): Parser {
  return {
    parse: (input: string) => { /* use opts via closure */ },
    validate: (input: string) => { /* ... */ },
  }
}
```

### Higher-order functions for reusable behaviour

```ts
export function withLogging<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => T {
  return (...args) => {
    console.log('calling', fn.name)
    return fn(...args)
  }
}
```
