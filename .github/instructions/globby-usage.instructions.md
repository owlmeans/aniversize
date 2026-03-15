---
applyTo: "src/**"
---

# File Discovery with globby

Use `globby` for finding files by glob patterns. It is the primary tool for discovering `.aniversize/` files across a project tree.

## When to Use

- Scanning for `.aniversize/` directories and their contents
- Finding all rule files (`rules/*.md`), skill files, etc.
- Discovering nested `.aniversize/` folders that mirror project structure

## API Reference

```ts
import { globby } from 'globby'
```

### Basic usage

```ts
const ruleFiles = await globby('**/.aniversize/rules/*.md', {
  cwd: projectRoot,
  absolute: true,
})
```

### Multiple patterns

```ts
const files = await globby([
  '**/.aniversize/PROJECT.md',
  '**/.aniversize/rules/*.md',
  '**/.aniversize/skills/*/SKILL.md',
], { cwd: projectRoot })
```

### Ignore patterns

```ts
const files = await globby('**/.aniversize/**/*.md', {
  cwd: projectRoot,
  ignore: ['**/node_modules/**', '**/dist/**'],
})
```

## Key Points

- Always set `cwd` explicitly — don't rely on `process.cwd()` in library code.
- Use `ignore` to skip `node_modules/`, `dist/`, and other non-source directories.
- globby returns paths sorted and deduplicated.
- The library is ESM-only — import with `import { globby } from 'globby'`.
- For checking if files exist by pattern, use `globby` + length check rather than `fs.existsSync` with manual glob expansion.
