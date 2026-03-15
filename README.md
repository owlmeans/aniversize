# Agent Universal Guideline formatter

> One universal format for AI coding agent instructions. Write once, sync everywhere.

`aniversize` lets you maintain a single source of truth for your AI coding agent configuration and synchronise it to whichever agent tool your team uses — GitHub Copilot, Claude Code, Codex, or Antigravity.

## Why

Every AI coding agent has its own configuration format:

| Agent | Config file(s) |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` |
| Claude Code | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/commands/` |
| Codex | `codex.json` (`customInstructions`), `.codex/` |
| Antigravity | `ANTIGRAVITY.md`, `.antigravity/` |

`aniversize` stores everything in a neutral `.aniversize/` folder and converts in both directions — from agent files into universal format (`unify`) and from universal format into agent files (`generate`, coming soon).

## Install

```sh
# Global
npm install -g aniversize

# One-off
npx aniversize <command>
bunx aniversize <command>
```

## Commands

### `identify [root]`

Detect which AI coding agent is configured in the project and write `.aniversize/meta.json`.

```sh
aniversize identify
# Scanning /my/project for AI coding agent configurations...
#
# GitHub Copilot:
#   .github/copilot-instructions.md
#   .github/instructions/
#
# Primary agent: GitHub Copilot
# Wrote .aniversize/meta.json
```

Pass `--dry` to skip writing `meta.json` (prints `Would write ...` instead).

The detected agent is stored in `.aniversize/meta.json`:

```json
{ "primary": "copilot" }
```

### `unify [agent]`

Read the agent's existing configuration files and write them into the `.aniversize/` universal format. Stale `.aniversize/` files that have no corresponding source are deleted.

```sh
# Auto-detect agent from meta.json (or run identify first)
aniversize unify

# Explicit agent
aniversize unify copilot
aniversize unify claude

# Preview without writing anything
aniversize unify --dry
```

Example output:

```sh
Unifying GitHub Copilot configuration into .aniversize format…

  wrote   .aniversize/PROJECT.md
  wrote   .aniversize/rules/folder-module.md
  wrote   .aniversize/rules/functional-style.md
  deleted .aniversize/rules/old-rule.md

Done. 3 file(s) written, 1 file(s) deleted.
```

With `--dry` the output uses `would write` / `would delete` and no files are touched.

If no agent is specified and no `meta.json` exists, `unify` runs `identify` automatically.

### `update [agent]`

Read the `.aniversize/` universal format and write the appropriate configuration files for the primary agent. This is the reverse of `unify`.

```sh
# Auto-detect agent from .aniversize.json / meta.json (or run identify first)
aniversize update

# Explicit agent
aniversize update copilot
aniversize update claude

# Preview without writing anything
aniversize update --dry
```

Example output:

```sh
Updating GitHub Copilot configuration from .aniversize format…

  wrote   .github/copilot-instructions.md
  wrote   .github/instructions/typescript.instructions.md
  wrote   AGENTS.md

Done. 3 file(s) written, 0 file(s) skipped.
```

With `--dry` the output uses `would write` and no files are touched.

If no agent is specified and no `.aniversize.json` / `meta.json` exists, `update` runs `identify` automatically.

Mappings from `.aniversize/` to agent files:

| Source | Copilot | Claude | Codex | Antigravity |
|---|---|---|---|---|
| `PROJECT.md` | `.github/copilot-instructions.md` | `CLAUDE.md` | `codex.json` (`customInstructions`) | `ANTIGRAVITY.md` |
| `MEMORY.md` | — | `CLAUDE.local.md` | — | — |
| `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` |
| `rules/*.md` | `.github/instructions/*.instructions.md` | `.claude/commands/*.md` | `.codex/*.md` | `.antigravity/*.md` |
| `skills/*/SKILL.md` | `.github/instructions/*.instructions.md` | `.claude/commands/*.md` | `.codex/*.md` | `.antigravity/*.md` |

Rules without frontmatter are universal and written for every agent.

### `setup [agent]`

Set the primary agent in `.aniversize.json` and write its configuration files from `.aniversize/`. Equivalent to running `switch` followed by `update` in one step.

```sh
# Use agent from .aniversize.json, or prompt if not set
aniversize setup

# Explicit agent
aniversize setup copilot
aniversize setup claude

# Preview without writing anything
aniversize setup --dry
```

Example output:

```sh
Setting up GitHub Copilot configuration…

  wrote   .aniversize.json
  wrote   .github/copilot-instructions.md
  wrote   AGENTS.md

Done. 3 file(s) written, 0 file(s) skipped.
```

With `--dry` the output uses `would write` and no files are touched.

If no agent is specified and `.aniversize.json` has no `primary`, an interactive prompt asks you to pick one.

## The `.aniversize` Format

```
.aniversize/
  PROJECT.md        — Project overview; loaded by every agent
  AGENTS.md         — Agent role definitions (e.g. Explore, Review, Implement)
  MEMORY.md         — Persistent memory hints; keep short
  meta.json         — Written by identify; read by unify/generate
  rules/
    {name}.md       — Single rule with YAML frontmatter declaring which agent(s) use it
  skills/
    {name}/
      SKILL.md      — Self-contained capability description
```

### Rule frontmatter

```md
---
copilot: instruction
claude: rule
applyTo: "src/**"
---

# Rule: No direct DOM manipulation
Always use framework abstractions instead of `document.querySelector`.
```

A rule file with no frontmatter is treated as universal — applied to all agents.

## Development

```sh
bun install          # install dependencies
bun run dev -- identify   # run from source
bun run typecheck    # type-check without building
bun run build        # compile to dist/
bun test             # run tests
```

## License

MIT © OwlMeans
