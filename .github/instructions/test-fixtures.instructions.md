---
applyTo: "src/**"
---

# Fixture-Based Test Pattern

All tests that touch the file system either directly or indirectly **must** use
the fixture infrastructure in `src/common/file-util.ts` rather than creating
ad-hoc temporary directories with `os.tmpdir()`.

## Core utilities

```ts
import { withFixture, copyFixture, TMP_DIR, FIXTURES_DIR } from '../common/file-util.js'
```

### `withFixture(fixtureName, testFn)` — preferred for most tests

Copies the named fixture into `tmp/<fixtureName>-<uuid>/`, runs the callback,
and **removes the directory on success** or **preserves it on failure** for
investigation.

```ts
test('detects claude', () =>
  withFixture('claude-only', async (root) => {
    const result = await identify(root)
    expect(result.primary).toBe('claude')
  })
)
```

### `copyFixture(fixtureName)` — for tests that need setup between copy and run

Returns `{ root, cleanup(passed?) }`. Call `cleanup(true)` on success and
`cleanup(false)` on failure. Useful when additional files must be written into
the fixture after copying.

```ts
test('deletes stale rules', async () => {
  const ctx = await copyFixture('copilot-only')
  try {
    await outputFile(path.join(ctx.root, '.aniversize', 'rules', 'stale.md'), '# Stale')
    const result = await unify('copilot', ctx.root)
    expect(result.deleted).toContain('.aniversize/rules/stale.md')
    await ctx.cleanup(true)
  } catch (err) {
    await ctx.cleanup(false) // keep for investigation
    throw err
  }
})
```

## Available fixtures (`tests/fixtures/`)

| Name | Agent(s) present | Purpose |
|---|---|---|
| `claude-only` | Claude Code | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/commands/` |
| `copilot-only` | GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/` |
| `codex-only` | Codex | `codex.json` (with `customInstructions`), `.codex/` |
| `antigravity-only` | Antigravity | `ANTIGRAVITY.md`, `.antigravity/` |
| `claude-and-copilot` | Both, Claude wins | Priority test: Claude > Copilot |
| `copilot-and-codex` | Both, Copilot wins | Priority test: Copilot > Codex |
| `codex-and-antigravity` | Both, Codex wins | Priority test: Codex > Antigravity |
| `empty` | None | A project with no agent config; use as blank canvas |

## Where test output lands

All test directories are created inside `tmp/` at the project root.
`tmp/*` is git-ignored (but `tmp/.gitkeep` keeps the folder tracked).
Passed test directories are automatically deleted; failed directories are
preserved so you can inspect them.

## When `empty` is the right choice

Use the `empty` fixture as a blank starting point when a test requires a
custom layout that doesn't match any existing fixture:

```ts
test('handles deeply-nested agent file', () =>
  withFixture('empty', async (root) => {
    await outputFile(path.join(root, 'packages', 'api', 'CLAUDE.md'), '# API')
    const result = await identify(root)
    expect(result.primary).toBe('claude')
  })
)
```

## Adding new fixtures

Add a new subdirectory under `tests/fixtures/<fixture-name>/` that represents a
realistic project configuration for the scenario being tested. Document it in
the table above.

## No `os.tmpdir()` in tests

Never use `os.tmpdir()`, `makeTmpDir()`, or `fs.mkdtemp()` directly in test
files. All temporary directories must go through `withFixture` or `copyFixture`
so they land in `tmp/`, are uniquely named, and have consistent cleanup behaviour.
