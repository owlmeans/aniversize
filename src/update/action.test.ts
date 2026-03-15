import { describe, test, expect, afterEach, spyOn, mock } from 'bun:test'
import { updateAction } from './action.js'
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
// Explicit agent argument
// ---------------------------------------------------------------------------

describe('updateAction (explicit agent argument)', () => {
  afterEach(() => mock.restore())

  test('uses explicit agent argument when provided', () =>
    withFixture('aniversize-only', async (root) => {
      const { logs } = captureOutput()
      await updateAction('copilot', { root, yes: true })
      expect(logs.some(l => l.includes('GitHub Copilot'))).toBe(true)
    })
  )

  test('prints error and exits for unknown agent argument', () =>
    withFixture('empty', async (root) => {
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(updateAction('unknown-agent', { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('Unknown agent'))).toBe(true)
    })
  )

  test('writes expected files for copilot agent', () =>
    withFixture('aniversize-only', async (root) => {
      captureOutput()
      await updateAction('copilot', { root, yes: true })
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(true)
    })
  )

  test('writes expected files for claude agent', () =>
    withFixture('aniversize-only', async (root) => {
      captureOutput()
      await updateAction('claude', { root, yes: true })
      expect(await pathExists(path.join(root, 'CLAUDE.md'))).toBe(true)
      expect(await pathExists(path.join(root, 'CLAUDE.local.md'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// Agent from meta.json / .aniversize.json
// ---------------------------------------------------------------------------

describe('updateAction (agent from meta.json)', () => {
  afterEach(() => mock.restore())

  test('reads primary agent from meta.json when no argument is provided', () =>
    withFixture('aniversize-only', async (root) => {
      const { logs } = captureOutput()
      await updateAction(undefined, { root, yes: true })
      expect(logs.some(l => l.includes('GitHub Copilot'))).toBe(true)
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(true)
    })
  )

  test('reads primary agent from .aniversize.json (mark) when meta.json absent', () =>
    withFixture('empty', async (root) => {
      await outputFile(
        path.join(root, '.aniversize', 'PROJECT.md'),
        '# Project\n',
      )
      await outputFile(path.join(root, '.aniversize.json'), JSON.stringify({ primary: 'claude' }))
      const { logs } = captureOutput()
      await updateAction(undefined, { root, yes: true })
      expect(logs.some(l => l.includes('Claude Code'))).toBe(true)
      expect(await pathExists(path.join(root, 'CLAUDE.md'))).toBe(true)
    })
  )

  test('prints error and exits when meta has unknown primary agent', () =>
    withFixture('empty', async (root) => {
      await outputFile(
        path.join(root, '.aniversize', 'meta.json'),
        JSON.stringify({ primary: 'unknown' }),
      )
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(updateAction(undefined, { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('valid primary agent'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// Auto-identify when no configuration
// ---------------------------------------------------------------------------

describe('updateAction (auto-identify)', () => {
  afterEach(() => mock.restore())

  test('runs identify when no meta and no argument', () =>
    withFixture('copilot-only', async (root) => {
      // Populate .aniversize/ from scratch so update has content to write
      await outputFile(path.join(root, '.aniversize', 'PROJECT.md'), '# Project\n')
      const { logs } = captureOutput()
      await updateAction(undefined, { root, yes: true })
      expect(logs.some(l => l.includes('identify'))).toBe(true)
      expect(logs.some(l => l.includes('GitHub Copilot'))).toBe(true)
    })
  )

  test('prints error and exits when identify finds no agent', () =>
    withFixture('empty', async (root) => {
      const { errors } = captureOutput()
      const exit = mockExit()
      await expect(updateAction(undefined, { root })).rejects.toThrow()
      expect(exit.getCode()).toBe(1)
      expect(errors.some(e => e.includes('No AI coding agent'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// Dry-run mode
// ---------------------------------------------------------------------------

describe('updateAction (dry-run)', () => {
  afterEach(() => mock.restore())

  test('prints "would write" lines without creating files', () =>
    withFixture('aniversize-only', async (root) => {
      const { logs } = captureOutput()
      await updateAction('copilot', { root, dry: true })
      expect(logs.some(l => l.includes('would write'))).toBe(true)
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(false)
    })
  )

  test('prints dry-run banner', () =>
    withFixture('aniversize-only', async (root) => {
      const { logs } = captureOutput()
      await updateAction('copilot', { root, dry: true })
      expect(logs.some(l => l.includes('Dry run'))).toBe(true)
    })
  )

  test('prints completion summary with "Dry run complete."', () =>
    withFixture('aniversize-only', async (root) => {
      const { logs } = captureOutput()
      await updateAction('copilot', { root, dry: true })
      expect(logs.some(l => l.includes('Dry run complete.'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// Empty .aniversize/
// ---------------------------------------------------------------------------

describe('updateAction (empty .aniversize/)', () => {
  afterEach(() => mock.restore())

  test('prints nothing-to-update message when .aniversize/ is empty', () =>
    withFixture('empty', async (root) => {
      const { logs } = captureOutput()
      await updateAction('copilot', { root, yes: true })
      expect(logs.some(l => l.includes('Nothing to update'))).toBe(true)
    })
  )
})
