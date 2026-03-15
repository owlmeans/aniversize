---
copilot: instruction
applyTo: "src/**"
claude: context
codex: rule
---
# Keeping Tests Current

When you **add a new command** or **modify an existing command** (in `src/cli.ts` or any `action.ts` / `model.ts`), you MUST also add or update the corresponding test files.

## File naming convention

Each folder module under `src/<feature>/` has two test files:

- `src/<feature>/model.test.ts` — unit tests for pure functions and model logic
- `src/<feature>/action.test.ts` — integration tests for the CLI action function

## model.test.ts rules

- Test every exported function individually.
- Use `withFixture` or `copyFixture` from `src/common/file-util.ts` for all file-system touching tests — never use `os.tmpdir()` or a custom `makeTmpDir()` helper.
- Cover: empty/missing input, happy path, edge cases (malformed input, missing fields, multiple items).
- Do **not** mock file system calls — use real temp directories.
- Import only from the module under test (no cross-module calls except shared consts/types).

## action.test.ts rules

- Spy on `console.log` and `console.error` to capture output without printing.
- Pass the fixture root directly as the `root` argument to the action — do **not** spy on `process.cwd()`.
- Spy on `process.exit` to prevent the test process from terminating; verify the exit code.
- Use `mock.restore()` in `afterEach` to clean up all spies.
- Cover: each agent resolution path (explicit arg, meta.json, auto-identify), all error cases that call `process.exit`, and key output messages.

## Test style

Use `withFixture` for most tests (fixture is copied and cleaned up automatically):

```ts
import { describe, test, expect, afterEach, spyOn, mock } from 'bun:test'
import { withFixture, copyFixture } from '../common/file-util.js'

describe('<functionName>', () => {
  afterEach(() => mock.restore())

  test('<what it does>', () =>
    withFixture('<fixture-name>', async (root) => {
      // root is a uniquely named copy of tests/fixtures/<fixture-name>
      // placed inside tmp/ and removed on success
      ...
    })
  )
})
```

Use `copyFixture` when additional files must be written into the fixture before running the action:

```ts
test('<what it does with extra files>', async () => {
  const ctx = await copyFixture('<fixture-name>')
  try {
    await outputFile(path.join(ctx.root, '.aniversize', 'rules', 'stale.md'), '# Stale')
    // ... run action and assert ...
    await ctx.cleanup(true)
  } catch (err) {
    await ctx.cleanup(false) // preserve for investigation
    throw err
  }
})
```

- Group tests by exported function or behaviour using `describe`.
- Name tests as plain statements: `'returns empty array when no files exist'`.
- Keep each test focused on one behaviour — one clear `expect` per test when possible.
- Never share mutable state between tests.
- Use the `empty` fixture as a blank canvas when a test needs a layout not covered by any existing fixture.
