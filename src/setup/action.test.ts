import { describe, test, expect, afterEach, spyOn, mock } from 'bun:test'
import { setupAction } from './action.js'
import { outputFile, pathExists, readFile } from 'fs-extra'
import path from 'path'
import { withFixture, copyFixture } from '../common/file-util.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureOutput(): { logs: string[]; errors: string[] } {
  const logs: string[] = []
  const errors: string[] = []
  spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.join(' '))
  })
  spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.join(' '))
  })
  return { logs, errors }
}

function mockExit(): { getCode: () => number | undefined } {
  let exitCode: number | undefined
  spyOn(process, 'exit').mockImplementation((code?: number) => {
    exitCode = code
    throw new Error(`process.exit(${code})`)
  })
  return { getCode: () => exitCode }
}

// ---------------------------------------------------------------------------
// Explicit agent argument
// ---------------------------------------------------------------------------

describe('setupAction (explicit agent argument)', () => {
  afterEach(() => mock.restore())

  test('uses explicit agent argument when provided', () =>
    withFixture('aniversize-only', async (root) => {
      const { logs } = captureOutput()
      await setupAction('copilot', { root, yes: true })
      expect(logs.some(l => l.includes('GitHub Copilot'))).toBe(true)
    })
  )

  test('prints error and exits for unknown agent argument', () =>
    withFixture('empty', async (root) => {
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(setupAction('unknown-agent', { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('Unknown agent'))).toBe(true)
    })
  )

  test('writes expected files for copilot agent', () =>
    withFixture('aniversize-only', async (root) => {
      captureOutput()
      await setupAction('copilot', { root, yes: true })
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(true)
    })
  )

  test('writes expected files for claude agent', () =>
    withFixture('aniversize-only', async (root) => {
      captureOutput()
      await setupAction('claude', { root, yes: true })
      expect(await pathExists(path.join(root, 'CLAUDE.md'))).toBe(true)
    })
  )

  test('writes .aniversize.json with the selected agent', () =>
    withFixture('aniversize-only', async (root) => {
      captureOutput()
      await setupAction('claude', { root, yes: true })
      const mark = JSON.parse(await readFile(path.join(root, '.aniversize.json'), 'utf-8')) as { primary: string }
      expect(mark.primary).toBe('claude')
    })
  )
})

// ---------------------------------------------------------------------------
// Agent from .aniversize.json (mark file only — meta.json ignored)
// ---------------------------------------------------------------------------

describe('setupAction (agent from .aniversize.json)', () => {
  afterEach(() => mock.restore())

  test('reads primary agent from .aniversize.json when no argument is provided', async () => {
    const ctx = await copyFixture('empty')
    try {
      await outputFile(path.join(ctx.root, '.aniversize', 'PROJECT.md'), '# Project\n')
      await outputFile(path.join(ctx.root, '.aniversize.json'), JSON.stringify({ primary: 'claude' }))
      const { logs } = captureOutput()
      await setupAction(undefined, { root: ctx.root, yes: true })
      expect(logs.some(l => l.includes('Claude Code'))).toBe(true)
      expect(await pathExists(path.join(ctx.root, 'CLAUDE.md'))).toBe(true)
      await ctx.cleanup(true)
    } catch (err) {
      await ctx.cleanup(false)
      throw err
    }
  })

  test('ignores meta.json and reads .aniversize.json only', async () => {
    const ctx = await copyFixture('empty')
    try {
      await outputFile(path.join(ctx.root, '.aniversize', 'PROJECT.md'), '# Project\n')
      // meta.json says copilot, .aniversize.json says claude — claude must win
      await outputFile(
        path.join(ctx.root, '.aniversize', 'meta.json'),
        JSON.stringify({ primary: 'copilot' }),
      )
      await outputFile(path.join(ctx.root, '.aniversize.json'), JSON.stringify({ primary: 'claude' }))
      const { logs } = captureOutput()
      await setupAction(undefined, { root: ctx.root, yes: true })
      expect(logs.some(l => l.includes('Claude Code'))).toBe(true)
      expect(await pathExists(path.join(ctx.root, 'CLAUDE.md'))).toBe(true)
      await ctx.cleanup(true)
    } catch (err) {
      await ctx.cleanup(false)
      throw err
    }
  })

  test('overwrites .aniversize.json with the resolved agent', async () => {
    const ctx = await copyFixture('empty')
    try {
      await outputFile(path.join(ctx.root, '.aniversize', 'PROJECT.md'), '# Project\n')
      await outputFile(path.join(ctx.root, '.aniversize.json'), JSON.stringify({ primary: 'claude' }))
      captureOutput()
      await setupAction(undefined, { root: ctx.root, yes: true })
      const mark = JSON.parse(
        await readFile(path.join(ctx.root, '.aniversize.json'), 'utf-8'),
      ) as { primary: string }
      expect(mark.primary).toBe('claude')
      await ctx.cleanup(true)
    } catch (err) {
      await ctx.cleanup(false)
      throw err
    }
  })
})

// ---------------------------------------------------------------------------
// Dry-run mode
// ---------------------------------------------------------------------------

describe('setupAction (dry-run)', () => {
  afterEach(() => mock.restore())

  test('prints would-write lines and writes no files', () =>
    withFixture('aniversize-only', async (root) => {
      const { logs } = captureOutput()
      await setupAction('copilot', { root, dry: true, yes: true })
      expect(logs.some(l => l.includes('Dry run'))).toBe(true)
      expect(logs.some(l => l.includes('would write'))).toBe(true)
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(false)
    })
  )
})
