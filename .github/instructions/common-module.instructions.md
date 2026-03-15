---
applyTo: "src/**"
---

# Common Module (`src/common/`)

The `src/common/` folder is a **foundation module** — a shared, dependency-free layer consumed by all feature modules. It has no imports from other `src/` modules.

## What lives here

```
src/common/
  types.ts    — AgentName, AniversizeMeta, AgentSignatureFiles (no project imports)
  consts.ts   — AGENT_NAMES, AGENT_LABELS, AGENT_SIGNATURE_FILES, ANIVERSIZE_DIR, META_PATH
  model.ts    — isAgentName(), readMeta() utility functions
  index.ts    — Barrel re-export of types, consts, and model
```

## Rules

- **`types.ts`** is the single source of truth for `AgentName`, `AniversizeMeta`, and `AgentSignatureFiles`. Never re-declare these in other modules.
- **`consts.ts`** imports only from `./types.js`. Add new agent entries here when a new agent is supported.
- **`model.ts`** imports from `./types.js` and `./consts.js` only. Keep functions pure and side-effect-free where possible; `readMeta` may do I/O.
- **`index.ts`** re-exports everything from `types.ts`, `consts.ts`, and `model.ts`.
- **No circular imports**: `common/` must never import from `identify/`, `unify/`, `converters/`, or any other feature module.

## Exception to the `types.ts` no-project-imports rule

Feature module `types.ts` files (e.g. `identify/types.ts`, `unify/types.ts`) **may** re-export `AgentName` from `../common/types.js`. This is the only permitted exception to the "types.ts has no project imports" rule — `common/types.ts` is a pure-type foundation with no upward dependencies, so importing it cannot create a circular reference.

```ts
// identify/types.ts
export type { AgentName } from '../common/types.js'

export interface IdentifyResult { ... }
```

## When to add to `common/`

Add to `common/` when:
- A type, constant, or utility is used (or will be used) by **two or more** feature modules.
- The item has **no dependency** on any feature module.

Do **not** add to `common/`:
- Logic specific to one feature (e.g. detection scoring → `identify/`)
- Agent-specific conversion logic (→ `unify/` or `converters/`)
- Side-effecting CLI actions (→ `action.ts` files)
- Shared CLI option types or top-level constants — these belong in `src/types.ts` or `src/consts.ts` (the `src/` root), not inside any module folder

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `AgentName` | type | Union of all agent slugs: `'claude' \| 'copilot' \| 'codex' \| 'antigravity'` |
| `AniversizeMeta` | type | Shape of `.aniversize/meta.json` |
| `AgentSignatureFiles` | type | Root files/folders that signal each agent |
| `AGENT_NAMES` | const | Ordered array of all agent slugs |
| `AGENT_LABELS` | const | Human-readable display name per agent |
| `AGENT_SIGNATURE_FILES` | const | Canonical root files and folders per agent |
| `ANIVERSIZE_DIR` | const | `'.aniversize'` |
| `META_PATH` | const | `'.aniversize/meta.json'` |
| `isAgentName` | function | Type guard: `(val: string) => val is AgentName` |
| `readMeta` | function | Read and parse `.aniversize/meta.json`; returns `null` if missing or malformed |

## Adding a new agent

1. Add the new slug to `AgentName` in `src/common/types.ts`.
2. Add label to `AGENT_LABELS` in `src/common/consts.ts`.
3. Add entry to `AGENT_SIGNATURE_FILES` in `src/common/consts.ts`.
4. Add the slug to `PRIORITY` in `src/identify/consts.ts` (position sets tie-break priority).
5. Add a `SignatureDef` entry (with `deepGlobs`) to `SIGNATURES` in `src/identify/consts.ts`.
6. Add a `read{Agent}Sources` function in `src/unify/model.ts` and wire it into `readAgentSources`.
