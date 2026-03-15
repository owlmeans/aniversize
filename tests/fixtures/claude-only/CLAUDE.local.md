## Persistent Memory

- Decided to use `fs-extra` for all file operations — avoids ENOENT on missing parent dirs (2024-01)
- Build output goes to `dist/` — never commit this folder
- Tests must use real temp directories, not mocks, for filesystem operations
- The `unify` command is the reverse of `generate` — reads agent files into `.aniversize/`
