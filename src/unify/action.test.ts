import { describe, test, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test'
import { unifyAction } from './action.js'
import { outputFile, pathExists } from 'fs-extra'
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
// Agent from explicit argument
// ---------------------------------------------------------------------------

describe('unifyAction (explicit agent argument)', () => {
  afterEach(() => mock.restore())

  test('uses explicit agent argument when provided', () =>
    withFixture('copilot-only', async (root) => {
      const { logs } = captureOutput()
      await unifyAction('copilot', { root })
      expect(logs.some(l => l.includes('GitHub Copilot'))).toBe(true)
    })
  )

  test('prints error and exits for unknown agent argument', () =>
    withFixture('empty', async (root) => {
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(unifyAction('unknown-agent', { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('Unknown agent'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// Agent from meta.json
// ---------------------------------------------------------------------------

describe('unifyAction (agent from meta.json)', () => {
  afterEach(() => mock.restore())

  test('reads agent from meta.json when no argument is provided', () =>
    withFixture('claude-only', async (root) => {
      await outputFile(
        path.join(root, '.aniversize', 'meta.json'),
        JSON.stringify({ primary: 'claude' })
      )
      const { logs } = captureOutput()
      await unifyAction(undefined, { root })
      expect(logs.some(l => l.includes('meta.json') && l.includes('Claude Code'))).toBe(true)
    })
  )

  test('prints error and exits when meta.json has invalid JSON', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, '.aniversize', 'meta.json'), 'not json{')
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(unifyAction(undefined, { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('invalid JSON'))).toBe(true)
    })
  )

  test('prints error and exits when meta.json has unknown primary agent', () =>
    withFixture('empty', async (root) => {
      await outputFile(
        path.join(root, '.aniversize', 'meta.json'),
        JSON.stringify({ primary: 'unknown' })
      )
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(unifyAction(undefined, { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('valid primary agent'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// Auto-identify when no meta.json
// ---------------------------------------------------------------------------

describe('unifyAction (auto-identify)', () => {
  afterEach(() => mock.restore())

  test('runs identify when no meta.json and no argument', () =>
    withFixture('copilot-only', async (root) => {
      const { logs } = captureOutput()
      await unifyAction(undefined, { root })
      expect(logs.some(l => l.includes('identify'))).toBe(true)
      expect(logs.some(l => l.includes('GitHub Copilot'))).toBe(true)
    })
  )

  test('writes meta.json after auto-identify', () =>
    withFixture('copilot-only', async (root) => {
      captureOutput()
      await unifyAction(undefined, { root })
      expect(await pathExists(path.join(root, '.aniversize', 'meta.json'))).toBe(true)
    })
  )

  test('prints error and exits when identify finds no agent and no argument', () =>
    withFixture('empty', async (root) => {
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(unifyAction(undefined, { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('No AI coding agent configuration found'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// Output messages
// ---------------------------------------------------------------------------

describe('unifyAction (output messages)', () => {
  afterEach(() => mock.restore())

  test('prints "wrote" lines for each written file', () =>
    withFixture('copilot-only', async (root) => {
      const { logs } = captureOutput()
      await unifyAction('copilot', { root })
      expect(logs.some(l => l.includes('wrote') && l.includes('PROJECT.md'))).toBe(true)
    })
  )

  test('prints "deleted" lines for stale managed files', async () => {
    const ctx = await copyFixture('copilot-only')
    try {
      await outputFile(path.join(ctx.root, '.aniversize', 'rules', 'stale.md'), '# Stale')
      const { logs } = captureOutput()
      await unifyAction('copilot', { root: ctx.root, yes: true })
      expect(logs.some(l => l.includes('deleted') && l.includes('stale.md'))).toBe(true)
      await ctx.cleanup(true)
    } catch (err) {
      await ctx.cleanup(false)
      throw err
    }
  })

  test('prints "Nothing to unify" when no agent files exist', () =>
    withFixture('empty', async (root) => {
      const { logs } = captureOutput()
      await unifyAction('copilot', { root })
      expect(logs.some(l => l.includes('Nothing to unify'))).toBe(true)
    })
  )

  test('prints summary with counts when files are processed', () =>
    withFixture('copilot-only', async (root) => {
      const { logs } = captureOutput()
      await unifyAction('copilot', { root })
      expect(logs.some(l => l.includes('Done.') && l.includes('written'))).toBe(true)
    })
  )

  test('prints the unifying header with agent label', () =>
    withFixture('copilot-only', async (root) => {
      const { logs } = captureOutput()
      await unifyAction('copilot', { root })
      expect(logs.some(l => l.includes('Unifying') && l.includes('GitHub Copilot'))).toBe(true)
    })
  )
})
