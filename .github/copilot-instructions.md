# aniversize — Copilot Instructions

## What This Project Is

`aniversize` is a TypeScript CLI tool published to npm. It is designed to be used as:

- A globally installed command: `npm install -g aniversize` → `aniversize`
- A one-off executable: `npx aniversize`, `bunx aniversize`, `yarn dlx aniversize`

The primary purpose is **unifying AI coding agent configuration across a project**. It lets teams write agent instructions once in a universal format (stored in `.aniversize/`) and then convert them into the format required by any specific agent (GitHub Copilot, Claude, Cursor, etc.). This avoids duplicating and hand-maintaining separate instruction files for each tool.

## The `.aniversize` Universal Format

All universal agent configuration lives in a `.aniversize/` folder at the project root (or nested inside subdirectories to mirror project structure). The tool reads from this folder and writes agent-specific output files into their expected locations.

### Folder Layout

```
.aniversize/
  PROJECT.md              — Project overview and general agent behaviour (read by every agent)
  AGENTS.md               — Agent roster / role definitions (copied to project root on generate)
  MEMORY.md               — Persistent memory hints for agents (summaries, decisions, context)
  skills/
    {skill-name}/
      SKILL.md            — Self-contained skill: description, examples, when to invoke
  rules/
    {rule-name}.md        — A single rule / guideline / instruction block
.aniversize.json          — Project-level lock file; overrides meta.json via deep merge (written by identify)
```

Nested guidelines follow the project directory tree — a `src/api/.aniversize/rules/` folder scopes its rules to `src/api/` only.

### Rule File Frontmatter

Each `rules/*.md` file uses YAML frontmatter to declare how it maps to each agent. Multiple agent properties may appear in the same file:

```md
---
copilot: instruction
claude: rule
cursor: rule
---

# Rule: No direct DOM manipulation
Always use framework abstractions instead of `document.querySelector`.
```

Supported frontmatter keys (one per agent):

| Key | Agents | Accepted values |
|---|---|---|
| `copilot` | GitHub Copilot | `instruction`, `prompt` |
| `claude` | Claude / Claude Code | `rule` |
| `cursor` | Cursor | `rule` |

A rule file with **no frontmatter** is treated as universal and included for all agents.

### `PROJECT.md`

Describes the project purpose, architecture overview, and any behaviour that every agent should always follow. Think of it as the root system prompt for the project.

### `AGENTS.md`

Defines named agents (roles) available in the project — e.g. `Explore`, `Review`, `Implement`. Placed in `.aniversize/` during authoring and copied to the project root during generation so each agent tool discovers it.

### `MEMORY.md`

Persistent memory that agents should carry across sessions: key decisions, architecture choices that must not be reversed, known pitfalls. Keep it pruned — long memory files bloat every agent's context window.

### Skills

Each skill lives in `skills/{skill-name}/SKILL.md`. A skill is a self-contained capability description: what it does, when to invoke it, usage examples, and any tool restrictions. Skills are referenced from `PROJECT.md` or frontmatter as needed.

### Mark Override

The `.aniversize.json` file at the project root is a **project-level lock file** managed by the `mark` module (`src/mark/`). It stores agent selection intent and overrides `.aniversize/meta.json` via a deep merge whenever that file is read.

```json
{ "primary": "copilot" }
```

- Written automatically by `identify` alongside `meta.json`.
- When any command reads agent configuration, it calls `readMetaWithMark` from `src/mark/model.ts`, which merges `.aniversize.json` on top of `meta.json`.
- If `.aniversize.json` exists but `meta.json` does not, the mark file alone is sufficient to resolve the primary agent.
- Intended for committing to version control to lock the project's primary agent across all contributors.
- Do not edit it manually — run `aniversize identify` to regenerate both files.

### Generation Workflow

```
aniversize generate [--agent <name>] [--dry-run] [-y]
```

1. Reads `.aniversize/` (and any nested `.aniversize/` directories).
2. Filters files by agent frontmatter.
3. Writes output into the agent-specific location (e.g. `.github/copilot-instructions.md`, `CLAUDE.md`, `.cursorrules`).
4. Copies `AGENTS.md` to the project root.

Use `--dry-run` to preview output paths and content diffs without writing files.

When `--dry` is not set and `-y` is not provided, the command prompts for confirmation before overwriting any existing file (only when content differs). Press `y` to overwrite, or Enter/`n` to skip. Use `-y` (`--yes`) to suppress all prompts and overwrite automatically.

### Identify Workflow

```
aniversize identify [root] [--dry] [-y]
```

Scans the project (rooted at `root` or `cwd`) to detect which AI coding agents are configured. Uses characteristic files and folders as signals, weighted by proximity to the project root. Prints all detected agents and their signals, then writes both `.aniversize/meta.json` and `.aniversize.json` (the mark lock file) with the identified primary agent.

Use `--dry` to skip all writes and instead print `Would write` lines for each file.

When `--dry` is not set and `-y` is not provided, the command prompts for confirmation before overwriting either file if it already exists with different content. Press `y` to overwrite, or Enter/`n` to skip. Use `-y` (`--yes`) to suppress all prompts and overwrite automatically.

**Supported agents (priority order):**

| Agent | Key file | Key folder |
|---|---|---|
| Claude Code | `CLAUDE.md`, `CLAUDE.local.md` | `.claude/` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/instructions/` |
| Codex | `codex.json` | `.codex/` |
| Antigravity | `ANTIGRAVITY.md` | `.antigravity/` |

When multiple agents are detected with equal confidence, Claude Code takes priority, followed by GitHub Copilot, Codex, and Antigravity.

The result is persisted in two files:

- `.aniversize/meta.json` — machine-written, inside the `.aniversize/` directory.
- `.aniversize.json` — the project-level mark lock file at the project root.

```json
{ "primary": "copilot" }
```

Both files are intended to be read by `unify`, `generate`, and future commands via `readMetaWithMark` from `src/mark/model.ts`. The mark file overrides `meta.json` via deep merge, so committing `.aniversize.json` to version control locks the primary agent for all contributors.

### Unify Workflow

```
aniversize unify [agent] [--dry] [-y]
```

Reads the specified agent's existing configuration files and synchronises them into the `.aniversize/` universal format. Acts as the **reverse** of `generate`: instead of writing agent files from `.aniversize/`, it populates `.aniversize/` from agent files.

Use `--dry` to skip all file writes and deletions; the command prints `would write` / `would delete` lines for every file it would have touched.

When `--dry` is not set and `-y` is not provided, the command prompts before overwriting any existing file whose content differs, and before deleting any stale managed file. Press `y` to proceed or Enter/`n` to skip. Files skipped by the user are reported as `skipped`. Use `-y` (`--yes`) to suppress all prompts.

1. Determine the target agent:
   - Use the `[agent]` argument if provided (`claude`, `copilot`, `codex`, `antigravity`).
   - Otherwise call `readMetaWithMark` (from `src/mark/model.ts`), which reads `.aniversize/meta.json` and deep-merges `.aniversize.json` on top. `.aniversize.json` alone is sufficient if `meta.json` is absent.
   - Otherwise run `identify` automatically, write both `meta.json` and `.aniversize.json`, and use the detected agent.
2. Read agent-specific source files:
   - **copilot**: `.github/copilot-instructions.md` → `PROJECT.md`; `.github/instructions/*.instructions.md` → `rules/*.md` (preserving `applyTo`)
   - **claude**: `CLAUDE.md` → `PROJECT.md`; `CLAUDE.local.md` → `MEMORY.md`; `.claude/commands/*.md` → `rules/*.md`
   - **codex**: `codex.json` (`customInstructions` field) → `PROJECT.md`; `.codex/*.md` → `rules/*.md`
   - **antigravity**: `ANTIGRAVITY.md` → `PROJECT.md`; `.antigravity/*.md` → `rules/*.md`
3. Write the converted files into `.aniversize/` (parent dirs created automatically).
4. Delete any previously managed `.aniversize/` files (`PROJECT.md`, `MEMORY.md`, `rules/**/*.md`, `skills/**/*.md`) that have no corresponding source file in the current run.

Managed files that are **never** touched: `meta.json`, `AGENTS.md`.

Source files are read from `src/unify/` which follows the folder-module pattern (`types.ts`, `consts.ts`, `model.ts`, `action.ts`, `index.ts`).

### Update Workflow

```
aniversize update [agent] [--dry] [-y]
```

Reads `.aniversize/` universal format files and writes the appropriate configuration files for the target agent. Acts as the **reverse** of `unify`.

Use `--dry` to skip all file writes; the command prints `would write` lines for every file it would have created or overwritten.

When `--dry` is not set and `-y` is not provided, the command prompts before overwriting any existing file whose content differs. Press `y` to proceed or Enter/`n` to skip. Files skipped by the user are reported as `skipped`. Use `-y` (`--yes`) to suppress all prompts.

1. Determine the target agent:
   - Use the `[agent]` argument if provided (`claude`, `copilot`, `codex`, `antigravity`).
   - Otherwise call `readMetaWithMark` (from `src/mark/model.ts`). `.aniversize.json` alone is sufficient if `meta.json` is absent.
   - Otherwise run `identify` automatically and use the detected agent.
2. Read `.aniversize/` source files: `PROJECT.md`, `MEMORY.md`, `AGENTS.md`, `rules/**/*.md`, `skills/**/SKILL.md` (all except `meta.json`).
3. Filter rules and skills by agent frontmatter. A file with no agent-specific key is universal and written for every agent.
4. Write to agent-specific output locations:
   - **copilot**: `PROJECT.md` → `.github/copilot-instructions.md`; rules/skills → `.github/instructions/*.instructions.md`; `AGENTS.md` → `AGENTS.md`
   - **claude**: `PROJECT.md` → `CLAUDE.md`; `MEMORY.md` → `CLAUDE.local.md`; rules/skills → `.claude/commands/*.md`; `AGENTS.md` → `AGENTS.md`
   - **codex**: `PROJECT.md` → `codex.json` (`customInstructions` field, other fields preserved); rules/skills → `.codex/*.md`; `AGENTS.md` → `AGENTS.md`
   - **antigravity**: `PROJECT.md` → `ANTIGRAVITY.md`; rules/skills → `.antigravity/*.md`; `AGENTS.md` → `AGENTS.md`

Source files are read and output converters live in `src/update/` which follows the folder-module pattern (`types.ts`, `consts.ts`, `model.ts`, `action.ts`, `index.ts`).

### Setup Workflow

```
aniversize setup [agent] [--dry] [-y]
```

Sets the primary agent in `.aniversize.json` and then writes the appropriate configuration files from `.aniversize/`. Combines `switch` and `update` into a single step.

Use `--dry` to skip all file writes; the command prints `would write` lines for every file it would have created or overwritten.

When `--dry` is not set and `-y` is not provided, the command prompts before overwriting any existing file whose content differs. Press `y` to proceed or Enter/`n` to skip. Use `-y` (`--yes`) to suppress all prompts.

1. Determine the target agent:
   - Use the `[agent]` argument if provided (`claude`, `copilot`, `codex`, `antigravity`).
   - Otherwise read `.aniversize.json` **only** (deliberately skips `meta.json`) and use `primary` if present.
   - Otherwise prompt the user with an interactive `select` (same as `switch` with no argument).
2. Write the selected agent into `.aniversize.json` as the `primary` field.
3. Read `.aniversize/` source files and write to agent-specific output locations (identical to the `update` command).

Source files are read and output converters live in `src/setup/` which follows the folder-module pattern (`types.ts`, `consts.ts`, `model.ts`, `action.ts`, `index.ts`).

## Tech Stack

- **Runtime**: Bun (build + dev) / Node.js (production runtime via compiled output)
- **Language**: TypeScript (strict mode, ESNext target)
- **Module format**: ESM (`"type": "module"`)
- **Bundler**: `bun build` (produces a single-file `dist/cli.js`)
- **Package manager**: Bun (`bun install`, lockfile: `bun.lockb`)

### Runtime Dependencies

- **globby** — Glob-based file discovery (finding `.aniversize/` files across the project tree)
- **through2** — Transform stream construction for file-processing pipelines
- **fs-extra** — Extended file system utilities (async I/O, `outputFile`, `ensureDir`, `copy`)
- **enquirer** — Interactive CLI prompts (confirmation before overwriting or deleting files)

## Project Structure

```
.aniversize/              — Universal agent configuration (source of truth)
  PROJECT.md
  AGENTS.md
  MEMORY.md
  meta.json         — Written by identify; read by unify and generate
  skills/{name}/SKILL.md
  rules/{name}.md
src/
  cli.ts            — CLI entry point (arg parsing, subcommand routing, --version, --help)
  index.ts          — Library entry (exported run() and public API)
  common/           — Shared types, consts, model utilities, and file-util helpers
  identify/         — Folder module: agent detection logic (types, consts, model, action)
  unify/            — Folder module: agent→.aniversize sync (types, consts, model, action)
  update/           — Folder module: .aniversize→agent files sync (types, consts, model, action)
  setup/            — Folder module: set primary agent + write agent files (switch + update)
  mark/             — Folder module: .aniversize.json lock file read/write and meta merge
tests/
  fixtures/         — Static fixture projects used by tests (one subdir per scenario)
    claude-only/    — Full Claude Code project (CLAUDE.md, .claude/commands/)
    copilot-only/   — Full Copilot project (.github/copilot-instructions.md, instructions/)
    codex-only/     — Full Codex project (codex.json, .codex/)
    antigravity-only/ — Full Antigravity project (ANTIGRAVITY.md, .antigravity/)
    claude-and-copilot/ — Priority test: Claude wins
    copilot-and-codex/  — Priority test: Copilot wins
    codex-and-antigravity/ — Priority test: Codex wins
    empty/          — No agent config; use as blank canvas for custom test layouts
scripts/
  postbuild.ts      — Adds #!/usr/bin/env node shebang and chmod +x to dist/cli.js
tmp/              — Test run output (git-ignored content; .gitkeep tracks folder)
dist/             — Build output (gitignored, published to npm)
  cli.js            — Compiled CLI binary (has shebang, chmod +x)
  index.js          — Compiled library entry
  *.d.ts            — Type declarations
package.json
tsconfig.json
```

## Key Commands

| Command | Purpose |
|---|---|
| `bun run dev` | Run CLI from source (no build needed) |
| `bun run build` | Compile to `dist/`, inject shebang into `dist/cli.js` |
| `bun run typecheck` | Type-check without emitting |
| `bun install` | Install dependencies |
| `npm publish` | Publish to npm (runs `prepublishOnly` → `build` first) |
| `aniversize identify [root]` | Detect primary AI agent and write `.aniversize/meta.json` + `.aniversize.json` |
| `aniversize unify [agent]` | Sync agent config files into universal `.aniversize/` format |
| `aniversize update [agent]` | Write agent config files from `.aniversize/` universal format |
| `aniversize switch [agent]` | Change the primary agent locked in `.aniversize.json` (interactive select if no arg) |
| `aniversize setup [agent]` | Set primary agent in `.aniversize.json` then write agent configuration files |
| `aniversize <command> --dry` | Preview file operations without writing or deleting anything |
| `aniversize <command> -y` | Skip interactive confirmation — overwrite and delete without prompting |

## Development Workflow

1. Edit `src/cli.ts` for CLI behaviour and `src/index.ts` for core logic.
2. Add agent converters under `src/converters/` — one file per supported agent.
3. Test locally with `bun run dev -- <args>` (maps to `bun run ./src/cli.ts`).
4. Build with `bun run build` then test the binary: `node dist/cli.js` or `./dist/cli.js`.
5. Bump version in `package.json`, then `npm publish`.

## Publishing Notes

- Scope `@owlmeans` requires `"publishConfig": { "access": "public" }` for public packages.
- Only the `dist/` folder and `README.md` are published (`"files"` field).
- The `bin.aniversize` field points to `./dist/cli.js` which has the Node shebang injected by `scripts/postbuild.ts`.

## Conventions

- **Functional style only — no classes.** Use plain functions, closures, factory functions, and object literals. Never use `class` declarations or `this` binding. See `.github/instructions/functional-style.instructions.md` for patterns.
- Keep `src/cli.ts` thin — only arg parsing and process lifecycle (`process.exit`).
- Business logic lives in `src/index.ts` and additional modules under `src/`.
- Keep runtime dependencies minimal and intentional.
- ESM only — no CommonJS compatibility layer needed.
- Each agent converter in `src/converters/` must be independently testable and produce deterministic output.
- Frontmatter parsing is strict: unknown keys are warned about, not silently ignored.
- Rule files without frontmatter are universal — emitted for every agent.
- Never write directly to agent output files during development; always go through the generator so output stays consistent.
- Validate `.aniversize/` structure before generating — missing required files (e.g. `PROJECT.md`) should be a clear, actionable error.
- Keep `MEMORY.md` short and current; prune entries that are no longer relevant to avoid bloating agent context windows.
- Skills should be self-contained: a skill's `SKILL.md` must make sense without reading anything else.
- Nested `.aniversize/` directories are resolved relative to the project root and their output paths respect the same nesting.
- Use `--dry-run` when testing generation changes — never overwrite agent files without reviewing diffs first.
- Agent detection in `src/identify/` uses a score-and-priority model: signals found at the project root carry more weight than deeply nested ones; ties are broken by the fixed priority order (Claude > Copilot > Codex > Antigravity).
- `.aniversize/meta.json` is the machine-written output of `identify` — do not hand-edit it. It feeds `unify` and future commands like `generate`.
- `.aniversize.json` is the project-level mark lock file written by `identify` alongside `meta.json`. It overrides `meta.json` via deep merge. Commit this file to lock the primary agent for all contributors. Managed by `src/mark/`.
- **Every command that reads agent configuration must use `readMetaWithMark` from `src/mark/model.ts`** instead of `readMeta` from `src/common/model.ts`. `readMetaWithMark` reads both `meta.json` and `.aniversize.json` and returns the merged result, ensuring the project lock is always respected.
- When adding support for a new agent to `identify`, add its `SignatureDef` entry to the `SIGNATURES` array in `src/identify/consts.ts` and add its label to `AGENT_LABELS`. The priority order is determined by the `PRIORITY` array.
- When adding support for a new agent to `unify`, add a `read{Agent}Sources` function in `src/unify/model.ts` and wire it into the `readAgentSources` switch.
- `unify` manages only `PROJECT.md`, `MEMORY.md`, `rules/**/*.md`, and `skills/**/*.md` inside `.aniversize/`. It never modifies `meta.json` or `AGENTS.md`.
- The `switch` command (`src/switch/`) changes only `.aniversize.json` (and `meta.json` via `writeIdentifyMeta`). It does **not** accept `--dry` or `-y` — it always writes immediately. When no agent slug is passed, it prompts with an interactive `select` using `enquirer`.
- **When you add or modify a command** (in `src/cli.ts` or any `action.ts`), also update `.github/copilot-instructions.md` (Key Commands table + workflow section) and `README.md` (Commands section + example). See `.github/instructions/update-copilot-instructions.instructions.md` and `.github/instructions/update-readme.instructions.md` for the required format.
- **All action functions and model functions that operate on project files must accept an optional `root?: string` parameter** resolved via `resolveProjectRoot(root)` from `src/common/file-util.ts`. This makes every function testable without mocking `process.cwd()`. See `.github/instructions/context-path.instructions.md`.
- **Every command that writes or deletes files must support `--dry` mode.** The `--dry` flag is a global CLI option (declared on the `program` in `src/cli.ts`) and is passed as a `dry?: boolean` parameter to the relevant action and model functions. In dry mode no files are written or deleted; the action prints `would write` and `would delete` lines for each affected path. Use `dryOutputFile` and `dryRemove` from `src/common/file-util.ts` as drop-in replacements for `outputFile` and `remove`. The `GlobalOpts` type in `src/types.ts` carries `root`, `dry`, and `yes`. See `.github/instructions/dry-run-support.instructions.md` for the full pattern.
- **Every command that writes or deletes files must support interactive confirmation.** Outside of dry-run mode, if `-y` (`--yes`) is not provided, the command must prompt the user before overwriting an existing file (only when content differs) or before deleting a file. The prompt defaults to **no** — pressing Enter or `n` skips the operation; pressing `y` proceeds. Use `enquirer` (via the `confirmInteractive` helper inside `dryOutputFile`/`dryRemove`) for prompts. Pass `yes?: boolean` from `GlobalOpts` through `RunOpts` to the model layer. Tests that pre-populate files must pass `{ yes: true }` to avoid timing out on unattended prompts.
- **All filesystem tests use the fixture-based pattern** — copy a named fixture from `tests/fixtures/` into `tmp/` via `withFixture` or `copyFixture`, run the test, and clean up after. Never use `os.tmpdir()` or `makeTmpDir()` directly. See `.github/instructions/test-fixtures.instructions.md` for the full pattern and available fixtures.
