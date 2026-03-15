import { describe, test, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test'
import { identifyAction } from './action.js'
import { outputFile, pathExists } from 'fs-extra'
import path from 'path'
import { withFixture } from '../common/file-util.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureConsole(): { logs: string[]; errors: string[] } {
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

// ---------------------------------------------------------------------------
// identifyAction — no-agent cases (empty fixture)
// ---------------------------------------------------------------------------

describe('identifyAction (empty project)', () => {
  afterEach(() => mock.restore())

  test('prints "no agent found" message', () =>
    withFixture('empty', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs.some(l => l.includes('No recognized AI coding agent configuration found.'))).toBe(true)
    })
  )

  test('does not write meta.json when no agent is found', () =>
    withFixture('empty', async (root) => {
      captureConsole()
      await identifyAction({ root })
      expect(await pathExists(path.join(root, '.aniversize', 'meta.json'))).toBe(false)
    })
  )

  test('prints scanning header with resolved project root', () =>
    withFixture('empty', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs[0]).toContain('Scanning')
      expect(logs[0]).toContain(root)
    })
  )
})

// ---------------------------------------------------------------------------
// identifyAction — claude-only fixture
// ---------------------------------------------------------------------------

describe('identifyAction (claude-only)', () => {
  afterEach(() => mock.restore())

  test('prints detected agent label', () =>
    withFixture('claude-only', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs.some(l => l.includes('Claude Code'))).toBe(true)
    })
  )

  test('prints signal files', () =>
    withFixture('claude-only', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs.some(l => l.includes('CLAUDE.md'))).toBe(true)
    })
  )

  test('prints primary agent line', () =>
    withFixture('claude-only', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs.some(l => l.includes('Primary agent:') && l.includes('Claude Code'))).toBe(true)
    })
  )

  test('writes meta.json and prints its relative path', () =>
    withFixture('claude-only', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(await pathExists(path.join(root, '.aniversize', 'meta.json'))).toBe(true)
      expect(logs.some(l => l.startsWith('Wrote'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// identifyAction — copilot-only fixture
// ---------------------------------------------------------------------------

describe('identifyAction (copilot-only)', () => {
  afterEach(() => mock.restore())

  test('prints primary agent line for copilot', () =>
    withFixture('copilot-only', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs.some(l => l.includes('Primary agent:') && l.includes('GitHub Copilot'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// identifyAction — combined fixtures (priority)
// ---------------------------------------------------------------------------

describe('identifyAction (claude-and-copilot)', () => {
  afterEach(() => mock.restore())

  test('prints both detected agents', () =>
    withFixture('claude-and-copilot', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs.some(l => l.includes('Claude Code'))).toBe(true)
      expect(logs.some(l => l.includes('GitHub Copilot'))).toBe(true)
    })
  )

  test('picks claude as primary', () =>
    withFixture('claude-and-copilot', async (root) => {
      const { logs } = captureConsole()
      await identifyAction({ root })
      expect(logs.some(l => l.includes('Primary agent:') && l.includes('Claude Code'))).toBe(true)
    })
  )
})

// ---------------------------------------------------------------------------
// identifyAction — relative path and default cwd
// ---------------------------------------------------------------------------

describe('identifyAction (path resolution)', () => {
  afterEach(() => mock.restore())

  test('resolves relative path argument', () =>
    withFixture('claude-only', async (root) => {
      const { logs } = captureConsole()
      const rel = path.relative(process.cwd(), root)
      await identifyAction({ root: rel })
      expect(logs[0]).toContain(path.resolve(rel))
    })
  )

  test('uses process.cwd() when no argument is provided', async () => {
    // This test runs against the real project root — just verify it doesn't throw
    // and uses the actual cwd in the header.
    const { logs } = captureConsole()
    await identifyAction()
    expect(logs[0]).toContain('Scanning')
    expect(logs[0]).toContain(process.cwd())
  })
})

// ---------------------------------------------------------------------------
// identifyAction — edge cases with custom layout
// ---------------------------------------------------------------------------

describe('identifyAction (custom layout)', () => {
  afterEach(() => mock.restore())

  test('handles project with only nested agent files', () =>
    withFixture('empty', async (root) => {
      const { logs } = captureConsole()
      await outputFile(path.join(root, 'packages', 'api', 'CLAUDE.md'), '# Claude')
      await identifyAction({ root })
      expect(logs.some(l => l.includes('Claude Code'))).toBe(true)
    })
  )
})
