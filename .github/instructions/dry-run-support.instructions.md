---
copilot: instruction
applyTo: "src/**"
---
# Dry-Run Support and Interactive Confirmation — Every Command That Mutates Files

All CLI commands and any model/logic function that **creates, updates, or
deletes files** must support two complementary safety modes:

1. **`--dry` mode** — no file-system changes are made; the command only prints
   what it *would* do.
2. **Interactive confirmation** — outside of dry-run mode, if `-y` is not
   provided, the user is asked before each overwrite or deletion.

## Why

- Safe to run in unfamiliar projects or CI to audit what would change.
- Enables testing command logic without producing file-system side effects.
- Makes every file-mutating command inspectable before it touches shared files.
- Interactive mode prevents accidental overwrites when running live without `-y`.

## CLI wiring

`--dry` and `-y`/`--yes` are **global** options declared once on the root
`program` in `src/cli.ts` and automatically available for every subcommand:

```ts
program.option('--dry', 'dry run — list files to create or delete without writing them')
program.option('-y, --yes', 'skip interactive confirmation — overwrite and delete without prompting')
```

Both values are forwarded to action functions through `GlobalOpts` from
`src/types.ts`:

```ts
export interface GlobalOpts {
  root?: string
  dry?: boolean
  yes?: boolean
}
```

## Pattern: action functions

Extract `dry` and `yes` from `opts`, print a mode banner, then pass both to
model functions via `RunOpts`:

```ts
import type { GlobalOpts } from '../types.js'
import { resolveProjectRoot } from '../common/file-util.js'

export async function myAction(arg?: string, opts: GlobalOpts = {}): Promise<void> {
  const { root, dry = false, yes = false } = opts
  const projectRoot = resolveProjectRoot(root)
  if (dry) console.log('Dry run — no files will be written or deleted.\n')

  const result = await myModelFunction(arg, projectRoot, { dry, yes })

  for (const written of result.written) {
    console.log(dry ? `  would write  ${written}` : `  wrote   ${written}`)
  }
  for (const deleted of result.deleted) {
    console.log(dry ? `  would delete ${deleted}` : `  deleted ${deleted}`)
  }
  for (const skipped of result.skipped) {
    console.log(`  skipped  ${skipped}`)
  }
}
```

## Pattern: model functions

Accept `opts: RunOpts = {}` and thread both `dry` and `yes` through to
`dryOutputFile` and `dryRemove`. Never call `outputFile` or `remove` directly
in model code:

```ts
import { dryOutputFile, dryRemove } from '../common/file-util.js'
import type { RunOpts } from '../common/types.js'

export async function writeConfig(
  filePath: string,
  content: string,
  opts: RunOpts = {},
): Promise<boolean> {
  const { dry = false, yes = false } = opts
  return dryOutputFile(filePath, content, dry, yes)
}

export async function removeStale(filePath: string, opts: RunOpts = {}): Promise<boolean> {
  const { dry = false, yes = false } = opts
  return dryRemove(filePath, dry, yes)
}
```

`RunOpts` is defined in `src/common/types.ts`:

```ts
export interface RunOpts {
  dry?: boolean
  yes?: boolean
}
```

## `dryOutputFile` and `dryRemove`

Use these drop-in replacements from `src/common/file-util.ts` instead of
calling `outputFile` and `remove` directly:

```ts
import { dryOutputFile, dryRemove } from '../common/file-util.js'

// In dry mode: skips write, returns false.
// If file exists with same content: skips write, returns true.
// If file exists with different content and yes=false: prompts user.
// Otherwise: writes file, returns true.
await dryOutputFile(targetPath, content, dry, yes)

// In dry mode: skips deletion, returns false.
// If file doesn't exist: returns true.
// If yes=false: prompts user before deleting.
// Otherwise: deletes file, returns true.
await dryRemove(targetPath, dry, yes)
```

Both helpers return a `Promise<boolean>` — `true` means the operation was
performed (or was already up-to-date), `false` means it was skipped (dry mode
or user declined). The caller uses this return value to decide whether to put
the path in `written`/`deleted` or `skipped`.

The helpers are **silent** — the caller is responsible for printing output.

## Console output convention

| Event | Dry output | Live output |
|---|---|---|
| File written | `  would write  <path>` | `  wrote   <path>` |
| File deleted | `  would delete <path>` | `  deleted <path>` |
| File skipped | *(n/a)* | `  skipped  <path>` |
| Mode banner | `Dry run — no files will be written or deleted.` | *(none)* |

Use two-space indentation and pad the verb so columns align in terminal output.

## Tests

Tests that pre-populate fixture files before calling a command must pass
`{ yes: true }` (or `{ root, yes: true }`) to the action/model function to
avoid timing out when the interactive prompt fires in an unattended environment.

```ts
test('overwrites stale file', () =>
  withFixture('copilot-only', async (root) => {
    await outputFile(path.join(root, '.aniversize', 'rules', 'old.md'), '# Old')
    const result = await unify('copilot', root, { yes: true })
    expect(result.deleted).toContain('.aniversize/rules/old.md')
  })
)
```

## Applies to

- All `action.ts` entry points for commands that write or delete files.
- All `model.ts` functions that perform file I/O (write, overwrite, delete).
- Any new utility introduced in `src/` that creates or removes files.
