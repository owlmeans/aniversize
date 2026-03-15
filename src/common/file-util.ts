import { fileURLToPath } from 'url'
import path from 'path'
import { copy, remove, ensureDir, outputFile, pathExists, readFile } from 'fs-extra'
import { randomUUID } from 'crypto'
import enquirer from 'enquirer'
import { diffLinesUnified } from 'jest-diff'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** Absolute path to the project root (two levels above `src/common/`) */
export const PROJECT_ROOT: string = path.resolve(__dirname, '..', '..')

/** Absolute path to `tests/fixtures/` */
export const FIXTURES_DIR: string = path.join(PROJECT_ROOT, 'tests', 'fixtures')

/** Absolute path to the project-local `tmp/` directory used for test runs */
export const TMP_DIR: string = path.join(PROJECT_ROOT, 'tmp')

/**
 * Ask the user whether to proceed with the given action.
 * Returns `true` when the user confirms (presses `y`),
 * `false` when they press Enter or `n` (the default).
 */
async function confirmInteractive(message: string): Promise<boolean> {
  const response = await (enquirer as unknown as {
    prompt: <T>(opts: object) => Promise<T>
  }).prompt<{ confirmed: boolean }>({
    type: 'confirm',
    name: 'confirmed',
    message,
    initial: false,
  })
  return response.confirmed
}

/**
 * Dry-run- and interactive-aware wrapper for `outputFile`.
 *
 * - When `dry` is `true` the write is skipped; returns `false`.
 * - When the file already exists with identical content, no write is
 *   performed; returns `true` (already up-to-date).
 * - When the file already exists with different content and `yes` is
 *   `false`, the user is prompted before overwriting. If they decline
 *   the write is skipped; returns `false`.
 * - Otherwise the file is written and `true` is returned.
 *
 * The caller is responsible for any console output ("would write" /
 * "wrote" / "skipped").
 */
export async function dryOutputFile(
  filePath: string,
  content: string,
  dry = false,
  yes = false,
): Promise<boolean> {
  if (dry) return false
  if (await pathExists(filePath)) {
    const existing = await readFile(filePath, 'utf-8')
    if (existing === content) return true // already up-to-date
    if (!yes) {
      const diff = diffLinesUnified(existing.split('\n'), content.split('\n'), {
        aAnnotation: 'current',
        bAnnotation: 'incoming',        contextLines: 3,
        expand: false,      })
      console.log(`\nIt tries to modify: ${filePath}\n${diff}\n`)
      const confirmed = await confirmInteractive(`Overwrite ${filePath}?`)
      if (!confirmed) return false
    }
  }
  await outputFile(filePath, content, 'utf-8')
  return true
}

/**
 * Dry-run- and interactive-aware wrapper for `remove`.
 *
 * - When `dry` is `true` the deletion is skipped; returns `false`.
 * - When the file does not exist, returns `true` (nothing to do).
 * - When `yes` is `false` the user is prompted before deleting.
 *   If they decline the deletion is skipped; returns `false`.
 * - Otherwise the file or directory is removed and `true` is returned.
 */
export async function dryRemove(filePath: string, dry = false, yes = false): Promise<boolean> {
  if (dry) return false
  if (!await pathExists(filePath)) return true
  if (!yes) {
    const confirmed = await confirmInteractive(`Delete ${filePath}?`)
    if (!confirmed) return false
  }
  await remove(filePath)
  return true
}

/**
 * Resolve an optional root path to an absolute path.
 *
 * When `root` is omitted or `undefined`, `process.cwd()` is used.
 * All CLI action functions and model entry points accept an optional
 * `root` parameter and delegate to this utility, which avoids any
 * need to mock `process.cwd()` in tests.
 */
export function resolveProjectRoot(root?: string): string {
  return root != null ? path.resolve(root) : process.cwd()
}

/** Handle returned by {@link copyFixture} */
export interface FixtureContext {
  /** Absolute path to the temporary directory containing the copied fixture */
  root: string
  /**
   * Remove the temporary directory when `passed` is `true` (default).
   * Pass `false` to keep it on disk for post-failure investigation.
   */
  cleanup: (passed?: boolean) => Promise<void>
}

/**
 * Copy a named fixture from `tests/fixtures/<fixtureName>` into a uniquely
 * named subdirectory of `tmp/` and return the path plus a cleanup handle.
 *
 * The subdirectory is named `<fixtureName>-<uuid>` so parallel tests never
 * collide.
 *
 * @param fixtureName - Directory name inside `tests/fixtures/`
 * @param baseDir     - Override the base directory (defaults to {@link TMP_DIR})
 */
export async function copyFixture(
  fixtureName: string,
  baseDir: string = TMP_DIR,
): Promise<FixtureContext> {
  const src = path.join(FIXTURES_DIR, fixtureName)
  const dest = path.join(baseDir, `${fixtureName}-${randomUUID()}`)
  await ensureDir(baseDir)
  await copy(src, dest)
  return {
    root: dest,
    cleanup: async (passed = true) => {
      if (passed) await remove(dest)
    },
  }
}

/**
 * Run a test callback against a temporary copy of a named fixture.
 *
 * The temporary directory is removed when the callback resolves
 * successfully, and **preserved** when it throws (for failure investigation).
 *
 * @example
 * ```ts
 * test('detects claude', () =>
 *   withFixture('claude-only', async (root) => {
 *     const result = await identify(root)
 *     expect(result.primary).toBe('claude')
 *   })
 * )
 * ```
 */
export async function withFixture(
  fixtureName: string,
  testFn: (root: string) => Promise<void>,
): Promise<void> {
  const ctx = await copyFixture(fixtureName)
  try {
    await testFn(ctx.root)
    await ctx.cleanup(true)
  } catch (err) {
    await ctx.cleanup(false)
    throw err
  }
}
