# Sample TypeScript Project

A demonstration TypeScript CLI tool configured for Claude Code.

## Architecture

- Functional programming style — no classes
- ESM modules throughout (`"type": "module"`)
- `src/` contains all source code split into feature modules

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
