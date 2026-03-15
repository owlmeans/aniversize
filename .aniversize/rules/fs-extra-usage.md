---
copilot: instruction
applyTo: "src/**"
claude: context
codex: rule
---
# File Operations with fs-extra

Use `fs-extra` for all file system operations. It extends Node's `fs` with promises, `ensureDir`, `copy`, `outputFile`, and other conveniences.

## When to Use

- Reading/writing generated agent configuration files
- Copying `AGENTS.md` to project root
- Creating output directories that may not exist yet
- Any file I/O in converters or the generator pipeline

## API Reference

```ts
import { readFile, outputFile, copy, ensureDir, pathExists } from 'fs-extra'
```

### Writing files (auto-create parent dirs)

```ts
// outputFile creates parent directories automatically
await outputFile(outputPath, content, 'utf-8')
```

### Reading files

```ts
const content = await readFile(filePath, 'utf-8')
```

### Copying files

```ts
await copy(src, dest, { overwrite: true })
```

### Checking existence

```ts
if (await pathExists(configDir)) { ... }
```

## Key Points

- Prefer `outputFile` over `writeFile` — it creates parent directories automatically, avoiding `ENOENT` errors.
- Always use the async/promise API (`import from 'fs-extra'`), never the sync variants.
- Use `ensureDir` before writing multiple files into a new directory to avoid race conditions.
- Import individual functions rather than the default export for better tree-shaking and clarity.
- Paths should be resolved with `path.resolve()` or `path.join()` — never concatenate strings.
