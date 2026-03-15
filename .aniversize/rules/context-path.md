---
copilot: instruction
applyTo: "src/**"
claude: context
codex: rule
---
# Context Path — Every Command and Function Accepts an Explicit Root

All CLI action functions and any model/logic function that operates on project
files **must** accept an optional `root?: string` parameter representing the
project root directory.

## Why

- Enables tests to call functions directly without mocking `process.cwd()`.
- Makes every command fully composable from scripts and library consumers.
- Works with the fixture-based test infrastructure (`tests/fixtures/`, `tmp/`).

## Pattern

Use `resolveProjectRoot` from `src/common/file-util.ts` to resolve the optional
parameter:

```ts
import { resolveProjectRoot } from '../common/file-util.js'

export async function myAction(arg?: string, root?: string): Promise<void> {
  const projectRoot = resolveProjectRoot(root)
  // use projectRoot for all file operations
}
```

`resolveProjectRoot` returns `path.resolve(root)` when `root` is provided, and
`process.cwd()` otherwise — exactly one line instead of inline conditionals.

## CLI wiring

The CLI (`src/cli.ts`) only passes positional arguments from the command line.
The `root` parameter is exclusively for programmatic use (tests, library
consumers).  Do **not** expose it as a CLI positional unless it genuinely makes
sense for the command (e.g. `identify [root]` already does this).

## Testing

Because every function accepts an explicit `root`, tests use fixture directories
directly instead of overriding `process.cwd()`:

```ts
// ✅ correct — pass root directly
test('writes PROJECT.md', () =>
  withFixture('copilot-only', async (root) => {
    await unifyAction('copilot', root)
    expect(await pathExists(path.join(root, '.aniversize', 'PROJECT.md'))).toBe(true)
  })
)

// ❌ avoid — do not mock process.cwd() when the function accepts a root param
spyOn(process, 'cwd').mockReturnValue(root)
await unifyAction('copilot')
```

## Applies to

- All `action.ts` entry points (CLI actions)
- All `model.ts` functions that read/write project files
- Any new utility function introduced in `src/`
