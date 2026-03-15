# Sample TypeScript Project

A demonstration TypeScript CLI tool configured for Antigravity (Gemini).

## Architecture

- Functional programming style — no classes
- ESM modules throughout (`"type": "module"`)
- Feature modules under `src/` follow a consistent pattern

## Conventions

- Use `fs-extra` for all file system operations
- Use `globby` for file discovery
- TypeScript strict mode is required

## Build & Dev

```sh
bun run build   # compile to dist/
bun run dev     # run from src/ via bun
bun test        # run all tests
```
