# Sample TypeScript Project

A demonstration TypeScript CLI tool configured for GitHub Copilot.

## Architecture

- Functional programming style — no classes
- ESM modules throughout (`"type": "module"`)
- Feature modules under `src/` follow the folder-module pattern

## Conventions

- Use `fs-extra` for all file system operations
- Use `globby` for file discovery
- Keep functions pure; isolate I/O at module edges
- TypeScript strict mode is required

## Build & Dev

```sh
bun run build   # compile to dist/
bun run dev     # run from src/ via bun
bun test        # run all tests
```
