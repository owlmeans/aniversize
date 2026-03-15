import { describe, test, expect } from 'bun:test'
import {
  parseFrontmatter,
  serializeFrontmatter,
  readCopilotSources,
  readClaudeSources,
  readCodexSources,
  readAntigravitySources,
  unify,
} from './model.js'
import { outputFile, pathExists, readFile } from 'fs-extra'
import path from 'path'
import { withFixture } from '../common/file-util.js'

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  test('returns empty frontmatter and full body when no frontmatter', () => {
    const result = parseFrontmatter('# Hello\nworld')
    expect(result.frontmatter).toEqual({})
    expect(result.body).toBe('# Hello\nworld')
  })

  test('parses key-value frontmatter', () => {
    const result = parseFrontmatter('---\ncopilot: instruction\napplyTo: src/**\n---\n# Body')
    expect(result.frontmatter).toEqual({ copilot: 'instruction', applyTo: 'src/**' })
    expect(result.body).toBe('# Body')
  })

  test('strips surrounding quotes from values', () => {
    const result = parseFrontmatter('---\napplyTo: "src/**"\n---\n')
    expect(result.frontmatter.applyTo).toBe('src/**')
  })

  test('body does not include the frontmatter block', () => {
    const result = parseFrontmatter('---\nkey: val\n---\nbody text')
    expect(result.body).toBe('body text')
  })

  test('handles empty body after frontmatter', () => {
    const result = parseFrontmatter('---\nkey: val\n---\n')
    expect(result.body).toBe('')
  })

  test('ignores lines without a colon in frontmatter', () => {
    const result = parseFrontmatter('---\nnocolon\nkey: val\n---\nbody')
    expect(result.frontmatter).toEqual({ key: 'val' })
  })
})

// ---------------------------------------------------------------------------
// serializeFrontmatter
// ---------------------------------------------------------------------------

describe('serializeFrontmatter', () => {
  test('returns empty string for empty object', () => {
    expect(serializeFrontmatter({})).toBe('')
  })

  test('produces valid frontmatter block', () => {
    const result = serializeFrontmatter({ copilot: 'instruction' })
    expect(result).toBe('---\ncopilot: instruction\n---\n')
  })

  test('quotes values containing special characters', () => {
    const result = serializeFrontmatter({ applyTo: 'src/**' })
    expect(result).toContain('"src/**"')
  })

  test('round-trips through parseFrontmatter', () => {
    const fm = { copilot: 'instruction', applyTo: 'src/**' }
    const serialized = serializeFrontmatter(fm)
    const parsed = parseFrontmatter(serialized + 'body')
    expect(parsed.frontmatter).toEqual(fm)
  })
})

// ---------------------------------------------------------------------------
// readCopilotSources — fixture-based
// ---------------------------------------------------------------------------

describe('readCopilotSources', () => {
  test('returns empty array when no copilot files exist', () =>
    withFixture('empty', async (root) => {
      const sources = await readCopilotSources(root)
      expect(sources).toEqual([])
    })
  )

  test('maps copilot-instructions.md body to PROJECT.md from copilot-only fixture', () =>
    withFixture('copilot-only', async (root) => {
      const sources = await readCopilotSources(root)
      const project = sources.find(s => s.targetPath === '.aniversize/PROJECT.md')
      expect(project).toBeDefined()
      expect(project!.content).toContain('# Sample TypeScript Project')
      expect(project!.sourcePath).toBe('.github/copilot-instructions.md')
    })
  )

  test('strips frontmatter from copilot-instructions.md', () =>
    withFixture('empty', async (root) => {
      await outputFile(
        path.join(root, '.github', 'copilot-instructions.md'),
        '---\nsome: key\n---\n# Body'
      )
      const sources = await readCopilotSources(root)
      const project = sources.find(s => s.targetPath === '.aniversize/PROJECT.md')
      expect(project!.content).not.toContain('some: key')
      expect(project!.content).toContain('# Body')
    })
  )

  test('maps each .instructions.md file to a rule from copilot-only fixture', () =>
    withFixture('copilot-only', async (root) => {
      const sources = await readCopilotSources(root)
      const ruleNames = sources
        .filter(s => s.targetPath.startsWith('.aniversize/rules/'))
        .map(s => s.targetPath)
      expect(ruleNames).toContain('.aniversize/rules/typescript.md')
      expect(ruleNames).toContain('.aniversize/rules/testing.md')
    })
  )

  test('adds copilot: instruction to rule frontmatter', () =>
    withFixture('copilot-only', async (root) => {
      const sources = await readCopilotSources(root)
      const rule = sources.find(s => s.targetPath === '.aniversize/rules/typescript.md')
      expect(rule!.content).toContain('copilot: instruction')
    })
  )

  test('preserves applyTo from instruction file frontmatter', () =>
    withFixture('copilot-only', async (root) => {
      const sources = await readCopilotSources(root)
      const rule = sources.find(s => s.targetPath === '.aniversize/rules/typescript.md')
      const { frontmatter } = parseFrontmatter(rule!.content)
      expect(frontmatter.applyTo).toBe('src/**')
    })
  )

  test('produces one source per instruction file', () =>
    withFixture('copilot-only', async (root) => {
      const sources = await readCopilotSources(root)
      const rules = sources.filter(s => s.targetPath.startsWith('.aniversize/rules/'))
      expect(rules.length).toBe(2)
    })
  )
})

// ---------------------------------------------------------------------------
// readClaudeSources — fixture-based
// ---------------------------------------------------------------------------

describe('readClaudeSources', () => {
  test('returns empty array when no claude files exist', () =>
    withFixture('empty', async (root) => {
      const sources = await readClaudeSources(root)
      expect(sources).toEqual([])
    })
  )

  test('maps CLAUDE.md body to PROJECT.md from claude-only fixture', () =>
    withFixture('claude-only', async (root) => {
      const sources = await readClaudeSources(root)
      const project = sources.find(s => s.targetPath === '.aniversize/PROJECT.md')
      expect(project!.content).toContain('# Sample TypeScript Project')
      expect(project!.sourcePath).toBe('CLAUDE.md')
    })
  )

  test('maps CLAUDE.local.md to MEMORY.md from claude-only fixture', () =>
    withFixture('claude-only', async (root) => {
      const sources = await readClaudeSources(root)
      const mem = sources.find(s => s.targetPath === '.aniversize/MEMORY.md')
      expect(mem).toBeDefined()
      expect(mem!.content).toContain('Persistent Memory')
      expect(mem!.sourcePath).toBe('CLAUDE.local.md')
    })
  )

  test('maps .claude/commands/*.md to rules from claude-only fixture', () =>
    withFixture('claude-only', async (root) => {
      const sources = await readClaudeSources(root)
      const ruleNames = sources
        .filter(s => s.targetPath.startsWith('.aniversize/rules/'))
        .map(s => s.targetPath)
      expect(ruleNames).toContain('.aniversize/rules/typescript.md')
      expect(ruleNames).toContain('.aniversize/rules/testing.md')
    })
  )

  test('adds claude: rule frontmatter to command files', () =>
    withFixture('claude-only', async (root) => {
      const sources = await readClaudeSources(root)
      const rule = sources.find(s => s.targetPath === '.aniversize/rules/typescript.md')
      expect(rule!.content).toContain('claude: rule')
    })
  )

  test('preserves existing frontmatter from command files', () =>
    withFixture('empty', async (root) => {
      await outputFile(
        path.join(root, '.claude', 'commands', 'cmd.md'),
        '---\nextra: value\n---\n# Body'
      )
      const sources = await readClaudeSources(root)
      const rule = sources.find(s => s.targetPath === '.aniversize/rules/cmd.md')
      const { frontmatter } = parseFrontmatter(rule!.content)
      expect(frontmatter.claude).toBe('rule')
      expect(frontmatter.extra).toBe('value')
    })
  )
})

// ---------------------------------------------------------------------------
// readCodexSources — fixture-based
// ---------------------------------------------------------------------------

describe('readCodexSources', () => {
  test('returns empty array when no codex files exist', () =>
    withFixture('empty', async (root) => {
      const sources = await readCodexSources(root)
      expect(sources).toEqual([])
    })
  )

  test('maps customInstructions from codex.json to PROJECT.md from codex-only fixture', () =>
    withFixture('codex-only', async (root) => {
      const sources = await readCodexSources(root)
      const project = sources.find(s => s.targetPath === '.aniversize/PROJECT.md')
      expect(project!.content).toContain('Use TypeScript strict mode')
      expect(project!.sourcePath).toBe('codex.json')
    })
  )

  test('skips codex.json with no customInstructions field', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, 'codex.json'), JSON.stringify({ model: 'gpt-4' }))
      const sources = await readCodexSources(root)
      expect(sources.find(s => s.targetPath === '.aniversize/PROJECT.md')).toBeUndefined()
    })
  )

  test('skips codex.json with malformed JSON', () =>
    withFixture('empty', async (root) => {
      await outputFile(path.join(root, 'codex.json'), 'not json{')
      const sources = await readCodexSources(root)
      expect(sources).toEqual([])
    })
  )

  test('maps .codex/*.md files to rules with codex: rule frontmatter from codex-only fixture', () =>
    withFixture('codex-only', async (root) => {
      const sources = await readCodexSources(root)
      const rule = sources.find(s => s.targetPath === '.aniversize/rules/typescript.md')
      expect(rule).toBeDefined()
      expect(rule!.content).toContain('codex: rule')
    })
  )
})

// ---------------------------------------------------------------------------
// readAntigravitySources — fixture-based
// ---------------------------------------------------------------------------

describe('readAntigravitySources', () => {
  test('returns empty array when no antigravity files exist', () =>
    withFixture('empty', async (root) => {
      const sources = await readAntigravitySources(root)
      expect(sources).toEqual([])
    })
  )

  test('maps ANTIGRAVITY.md body to PROJECT.md from antigravity-only fixture', () =>
    withFixture('antigravity-only', async (root) => {
      const sources = await readAntigravitySources(root)
      const project = sources.find(s => s.targetPath === '.aniversize/PROJECT.md')
      expect(project!.content).toContain('# Sample TypeScript Project')
      expect(project!.sourcePath).toBe('ANTIGRAVITY.md')
    })
  )

  test('maps .antigravity/*.md files to rules with antigravity: rule frontmatter', () =>
    withFixture('antigravity-only', async (root) => {
      const sources = await readAntigravitySources(root)
      const rule = sources.find(s => s.targetPath === '.aniversize/rules/typescript.md')
      expect(rule).toBeDefined()
      expect(rule!.content).toContain('antigravity: rule')
    })
  )
})

// ---------------------------------------------------------------------------
// unify — fixture-based integration tests
// ---------------------------------------------------------------------------

describe('unify', () => {
  test('writes PROJECT.md from copilot-only fixture', () =>
    withFixture('copilot-only', async (root) => {
      const result = await unify('copilot', root)
      expect(result.agent).toBe('copilot')
      expect(result.written).toContain('.aniversize/PROJECT.md')
      expect(await pathExists(path.join(root, '.aniversize', 'PROJECT.md'))).toBe(true)
    })
  )

  test('writes rule files from copilot-only fixture', () =>
    withFixture('copilot-only', async (root) => {
      const result = await unify('copilot', root)
      expect(result.written).toContain('.aniversize/rules/typescript.md')
      expect(result.written).toContain('.aniversize/rules/testing.md')
    })
  )

  test('deletes stale managed files not present in current agent sources', () =>
    withFixture('copilot-only', async (root) => {
      await outputFile(path.join(root, '.aniversize', 'rules', 'old.md'), '# Old rule')
      const result = await unify('copilot', root, { yes: true })
      expect(result.deleted).toContain('.aniversize/rules/old.md')
      expect(await pathExists(path.join(root, '.aniversize', 'rules', 'old.md'))).toBe(false)
    })
  )

  test('does not delete protected files (meta.json, AGENTS.md)', () =>
    withFixture('copilot-only', async (root) => {
      await outputFile(path.join(root, '.aniversize', 'meta.json'), '{"primary":"copilot"}')
      await outputFile(path.join(root, '.aniversize', 'AGENTS.md'), '# Agents')
      await unify('copilot', root)
      expect(await pathExists(path.join(root, '.aniversize', 'meta.json'))).toBe(true)
      expect(await pathExists(path.join(root, '.aniversize', 'AGENTS.md'))).toBe(true)
    })
  )

  test('returns empty written and deleted when no agent files exist', () =>
    withFixture('empty', async (root) => {
      const result = await unify('copilot', root)
      expect(result.written).toEqual([])
      expect(result.deleted).toEqual([])
    })
  )

  test('does not delete a file that was just written in the same run', () =>
    withFixture('copilot-only', async (root) => {
      await outputFile(path.join(root, '.aniversize', 'rules', 'typescript.md'), '# Old content')
      const result = await unify('copilot', root, { yes: true })
      expect(result.deleted).not.toContain('.aniversize/rules/typescript.md')
      const content = await readFile(path.join(root, '.aniversize', 'rules', 'typescript.md'), 'utf-8')
      expect(content).toContain('copilot: instruction')
    })
  )

  test('works with claude agent using claude-only fixture', () =>
    withFixture('claude-only', async (root) => {
      const result = await unify('claude', root)
      expect(result.agent).toBe('claude')
      expect(result.written).toContain('.aniversize/PROJECT.md')
      expect(result.written).toContain('.aniversize/MEMORY.md')
      expect(await pathExists(path.join(root, '.aniversize', 'MEMORY.md'))).toBe(true)
    })
  )

  test('works with codex agent using codex-only fixture', () =>
    withFixture('codex-only', async (root) => {
      const result = await unify('codex', root)
      expect(result.agent).toBe('codex')
      expect(result.written).toContain('.aniversize/PROJECT.md')
    })
  )

  test('works with antigravity agent using antigravity-only fixture', () =>
    withFixture('antigravity-only', async (root) => {
      const result = await unify('antigravity', root)
      expect(result.agent).toBe('antigravity')
      expect(result.written).toContain('.aniversize/PROJECT.md')
    })
  )
})
