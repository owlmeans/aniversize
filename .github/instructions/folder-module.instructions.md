---
copilot: instruction
applyTo: "src/**"
---
# Folder-module structure

When a feature module grows beyond a single file, convert it into a **folder module** — a directory named after the feature containing split responsibility files plus an `index.ts` barrel.

## Required file layout

```
src/{feature}/
  types.ts    — TypeScript types and interfaces only; no runtime code
  consts.ts   — Exported constants; imports from types.ts only
  model.ts    — Logic functions; imports from types.ts and consts.ts
  action.ts   — CLI/IO side-effecting entry point; imports from model.ts and types.ts
  index.ts    — Barrel re-export of types, consts, and model; never exports from action.ts
  *.test.ts   — Tests import directly from types.ts, consts.ts, or model.ts
```

## Rules

- `types.ts` has **no imports** from the project — pure type declarations only.
- `consts.ts` imports only from `types.ts`.
- `model.ts` imports from `types.ts` and `consts.ts`; never from `action.ts`.
- `action.ts` imports from `model.ts` and `types.ts` directly — **not** from `index.ts` — to avoid circular references.
- `index.ts` re-exports everything from `types.ts`, `consts.ts`, and `model.ts`. It **never** re-exports from `action.ts`.
- Consumers of the module (e.g. `src/index.ts`, other modules) import from `{feature}/index.js`.
- The CLI entry (`src/cli.ts`) imports action functions directly from `{feature}/action.js`.
- Tests import directly from the file under test (`model.js`, `consts.js`, etc.) for precision.

## Example import graph

```
cli.ts  ──────────────────────────────► action.ts
                                              │
src/index.ts ──► {feature}/index.ts          │
                      │                      ▼
                      ├──► types.ts ◄── model.ts ◄── consts.ts
                      ├──► consts.ts
                      └──► model.ts
```

## When to apply this pattern

Apply when a module has more than one of: types, constants, pure logic, and side-effecting I/O. A single-file module that stays small does not need to be split.
