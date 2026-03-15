# Agent Universal Guideline formatter

> One universal format for AI coding agent instructions. Write once, sync everywhere.

`@owlmeans/aniversize` lets you maintain a single source of truth for your AI coding agent configuration and synchronise it to whichever agent tool your team uses — GitHub Copilot, Claude Code, Codex, or Antigravity.

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
npm install -g @owlmeans/aniversize

# One-off
npx @owlmeans/aniversize <command>
bunx @owlmeans/aniversize <command>
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
