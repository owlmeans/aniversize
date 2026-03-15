import { describe, test, expect } from 'bun:test'
import { scoreForDepth, pickPrimary, identify, writeIdentifyMeta } from './model.js'
import { AGENT_LABELS } from './consts.js'
import { outputFile, pathExists, readFile } from 'fs-extra'
import path from 'path'
import { withFixture, copyFixture } from '../common/file-util.js'

// ---------------------------------------------------------------------------
// Pure function tests — no filesystem
// ---------------------------------------------------------------------------

describe('scoreForDepth', () => {
  test('root level scores 100', () => expect(scoreForDepth(0)).toBe(100))
  test('depth 1 scores 70', () => expect(scoreForDepth(1)).toBe(70))
  test('depth 2 scores 35', () => expect(scoreForDepth(2)).toBe(35))
  test('depth 3+ scores 12', () => {
    expect(scoreForDepth(3)).toBe(12)
    expect(scoreForDepth(10)).toBe(12)
  })
})

describe('pickPrimary', () => {
  test('returns null when no scores are positive', () => {
    expect(pickPrimary([
      { name: 'claude', score: 0, signals: [] },
      { name: 'copilot', score: 0, signals: [] },
    ])).toBeNull()
  })

  test('returns the highest scorer', () => {
    const result = pickPrimary([
      { name: 'claude', score: 35, signals: [] },
      { name: 'copilot', score: 100, signals: [] },
    ])
    expect(result?.name).toBe('copilot')
  })

  test('breaks ties by priority: claude beats copilot', () => {
    const result = pickPrimary([
      { name: 'copilot', score: 100, signals: [] },
      { name: 'claude', score: 100, signals: [] },
    ])
    expect(result?.name).toBe('claude')
  })

  test('breaks ties by priority: copilot beats codex', () => {
    const result = pickPrimary([
      { name: 'codex', score: 100, signals: [] },
      { name: 'copilot', score: 100, signals: [] },
    ])
    expect(result?.name).toBe('copilot')
  })

  test('breaks ties by priority: codex beats antigravity', () => {
    const result = pickPrimary([
      { name: 'antigravity', score: 100, signals: [] },
      { name: 'codex', score: 100, signals: [] },
    ])
    expect(result?.name).toBe('codex')
  })
})

// ---------------------------------------------------------------------------
// identify — fixture-based tests
// ---------------------------------------------------------------------------

describe('identify', () => {
  test('returns null primary for empty project', () =>
    withFixture('empty', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBeNull()
      expect(result.primaryLabel).toBeNull()
      expect(result.signals).toEqual({})
    })
  )

  test('detects copilot from copilot-only fixture', () =>
    withFixture('copilot-only', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBe('copilot')
      expect(result.primaryLabel).toBe(AGENT_LABELS.copilot)
      expect(result.signals.copilot).toContain('.github/copilot-instructions.md')
      expect(result.signals.copilot).toContain('.github/instructions/')
    })
  )

  test('detects claude from claude-only fixture', () =>
    withFixture('claude-only', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBe('claude')
      expect(result.primaryLabel).toBe(AGENT_LABELS.claude)
      expect(result.signals.claude).toContain('CLAUDE.md')
    })
  )

  test('detects codex from codex-only fixture', () =>
    withFixture('codex-only', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBe('codex')
      expect(result.signals.codex).toContain('codex.json')
    })
  )

  test('detects antigravity from antigravity-only fixture', () =>
    withFixture('antigravity-only', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBe('antigravity')
      expect(result.signals.antigravity).toContain('ANTIGRAVITY.md')
    })
  )

  test('claude beats copilot in combined fixture', () =>
    withFixture('claude-and-copilot', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBe('claude')
      expect(result.signals.claude).toBeDefined()
      expect(result.signals.copilot).toBeDefined()
    })
  )

  test('copilot beats codex in combined fixture', () =>
    withFixture('copilot-and-codex', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBe('copilot')
      expect(result.signals.copilot).toBeDefined()
      expect(result.signals.codex).toBeDefined()
    })
  )

  test('codex beats antigravity in combined fixture', () =>
    withFixture('codex-and-antigravity', async (root) => {
      const result = await identify(root)
      expect(result.primary).toBe('codex')
      expect(result.signals.codex).toBeDefined()
      expect(result.signals.antigravity).toBeDefined()
    })
  )

  // Edge cases that require custom directory structures

  test('detects copilot via root folder signal (.github/instructions/)', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, '.github', 'instructions', 'rules.md'), '# Rules')
      const result = await identify(root)
      expect(result.primary).toBe('copilot')
      expect(result.signals.copilot).toContain('.github/instructions/')
    })
  )

  test('detects claude via CLAUDE.local.md alone', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, 'CLAUDE.local.md'), '# Claude local')
      const result = await identify(root)
      expect(result.primary).toBe('claude')
    })
  )

  test('detects claude via .claude folder', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, '.claude', 'settings.json'), '{}')
      const result = await identify(root)
      expect(result.primary).toBe('claude')
      expect(result.signals.claude).toContain('.claude/')
    })
  )

  test('detects codex via .codex folder', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, '.codex', 'config.md'), '# Codex config')
      const result = await identify(root)
      expect(result.primary).toBe('codex')
    })
  )

  test('detects antigravity via .antigravity folder', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, '.antigravity', 'config.md'), '# Antigravity config')
      const result = await identify(root)
      expect(result.primary).toBe('antigravity')
    })
  )

  test('detects nested agent file', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, 'packages', 'app', 'CLAUDE.md'), '# Claude')
      const result = await identify(root)
      expect(result.primary).toBe('claude')
    })
  )

  test('root signal scores higher than deeply-nested competing agent', () =>
    withFixture('empty', async (root) => {
      // copilot at root (score 100) vs claude nested at depth 3 (score 12)
      await outputFile(path.join(root, '.github', 'copilot-instructions.md'), '# Copilot')
      await outputFile(path.join(root, 'a', 'b', 'c', 'CLAUDE.md'), '# Claude deep')
      const result = await identify(root)
      expect(result.primary).toBe('copilot')
    })
  )

  test('does not double-count root file also found by deep glob', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, 'CLAUDE.md'), '# Claude')
      const result = await identify(root)
      expect(result.signals.claude?.filter(s => s === 'CLAUDE.md').length).toBe(1)
    })
  )

  test('does not count files inside an already-counted root folder', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, '.claude', 'file.md'), '# Inside')
      const result = await identify(root)
      expect(result.signals.claude).toEqual(['.claude/'])
    })
  )

  test('ignores paths inside node_modules', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, 'node_modules', 'pkg', 'CLAUDE.md'), '# Claude in deps')
      const result = await identify(root)
      expect(result.primary).toBeNull()
    })
  )
})

// ---------------------------------------------------------------------------
// writeIdentifyMeta — fixture-based
// ---------------------------------------------------------------------------

describe('writeIdentifyMeta', () => {
  test('writes meta.json with primary agent', () =>
    withFixture('empty', async (root) => {
      const { meta } = await writeIdentifyMeta(root, 'copilot')
      const content = JSON.parse(await readFile(meta.path, 'utf-8'))
      expect(content).toEqual({ primary: 'copilot' })
    })
  )

  test('creates .aniversize directory automatically', () =>
    withFixture('empty', async (root) => {
      const { meta } = await writeIdentifyMeta(root, 'claude')
      expect(await pathExists(path.join(root, '.aniversize'))).toBe(true)
      expect(await pathExists(meta.path)).toBe(true)
    })
  )

  test('returns correct path to meta.json', () =>
    withFixture('empty', async (root) => {
      const { meta } = await writeIdentifyMeta(root, 'codex')
      expect(meta.path).toBe(path.join(root, '.aniversize', 'meta.json'))
    })
  )

  test('overwrites existing meta.json', () =>
    withFixture('empty', async (root) => {
      await writeIdentifyMeta(root, 'claude', { yes: true })
      const { meta } = await writeIdentifyMeta(root, 'copilot', { yes: true })
      const content = JSON.parse(await readFile(meta.path, 'utf-8'))
      expect(content).toEqual({ primary: 'copilot' })
    })
  )
})
