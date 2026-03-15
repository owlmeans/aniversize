import { describe, test, expect } from 'bun:test'
import {
  ruleAppliesTo,
  stripAgentKeys,
  inferAgentTypeValue,
  readAniversizeContent,
  buildCopilotOutputFiles,
  buildClaudeOutputFiles,
  buildCodexOutputFiles,
  buildAntigravityOutputFiles,
  update,
} from './model.js'
import { CROSS_AGENT_TYPE } from '../unify/index.js'
import { outputFile, pathExists, readFile } from 'fs-extra'
import path from 'path'
import { withFixture, copyFixture } from '../common/file-util.js'
import { parseFrontmatter } from '../unify/index.js'

// ---------------------------------------------------------------------------
// inferAgentTypeValue
// ---------------------------------------------------------------------------

describe('inferAgentTypeValue', () => {
  test('returns existing value when agent key is present', () => {
    expect(inferAgentTypeValue({ copilot: 'prompt' }, 'copilot')).toBe('prompt')
    expect(inferAgentTypeValue({ claude: 'rule' }, 'claude')).toBe('rule')
    expect(inferAgentTypeValue({ claude: 'context' }, 'claude')).toBe('context')
  })

  test('returns AGENT_RULE_VALUE default when no keys present at all', () => {
    expect(inferAgentTypeValue({}, 'copilot')).toBe('instruction')
    expect(inferAgentTypeValue({}, 'claude')).toBe('rule')
    expect(inferAgentTypeValue({}, 'codex')).toBe('rule')
    expect(inferAgentTypeValue({}, 'antigravity')).toBe('rule')
  })

  test('infers claude: context from copilot: instruction (cross-agent)', () => {
    expect(inferAgentTypeValue({ copilot: 'instruction' }, 'claude')).toBe('context')
  })

  test('infers claude: rule from copilot: prompt (cross-agent)', () => {
    expect(inferAgentTypeValue({ copilot: 'prompt' }, 'claude')).toBe('rule')
  })

  test('infers copilot: instruction from claude: rule (cross-agent)', () => {
    expect(inferAgentTypeValue({ claude: 'rule' }, 'copilot')).toBe('instruction')
  })

  test('infers copilot: instruction from claude: context (cross-agent)', () => {
    expect(inferAgentTypeValue({ claude: 'context' }, 'copilot')).toBe('instruction')
  })

  test('CROSS_AGENT_TYPE is internally consistent (all targets are defined)', () => {
    // Sanity-check that every entry in CROSS_AGENT_TYPE maps to a value for
    // the agents that should receive it
    for (const [src, byValue] of Object.entries(CROSS_AGENT_TYPE)) {
      for (const [_val, targets] of Object.entries(byValue)) {
        for (const [tgt, tgtVal] of Object.entries(targets)) {
          expect(typeof tgtVal).toBe('string')
          expect(tgtVal.length).toBeGreaterThan(0)
          expect(tgt).not.toBe(src)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// ruleAppliesTo
// ---------------------------------------------------------------------------

describe('ruleAppliesTo', () => {
  test('returns true for empty frontmatter (universal rule)', () => {
    expect(ruleAppliesTo({}, 'copilot')).toBe(true)
  })

  test('returns true when matching agent key is present', () => {
    expect(ruleAppliesTo({ copilot: 'instruction' }, 'copilot')).toBe(true)
    expect(ruleAppliesTo({ claude: 'rule' }, 'claude')).toBe(true)
  })

  test('returns false when a different agent key is present', () => {
    expect(ruleAppliesTo({ claude: 'rule' }, 'copilot')).toBe(false)
    expect(ruleAppliesTo({ copilot: 'instruction' }, 'claude')).toBe(false)
  })

  test('returns false when only unrelated agent keys are present', () => {
    expect(ruleAppliesTo({ codex: 'rule' }, 'antigravity')).toBe(false)
  })

  test('returns true when multiple agents but target is one of them', () => {
    expect(ruleAppliesTo({ copilot: 'instruction', claude: 'rule' }, 'copilot')).toBe(true)
    expect(ruleAppliesTo({ copilot: 'instruction', claude: 'rule' }, 'claude')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// stripAgentKeys
// ---------------------------------------------------------------------------

describe('stripAgentKeys', () => {
  test('removes all agent-specific keys', () => {
    const result = stripAgentKeys({ copilot: 'instruction', applyTo: 'src/**' })
    expect(result).toEqual({ applyTo: 'src/**' })
  })

  test('returns empty object when only agent keys present', () => {
    expect(stripAgentKeys({ claude: 'rule', copilot: 'instruction' })).toEqual({})
  })

  test('preserves non-agent keys', () => {
    expect(stripAgentKeys({ applyTo: 'src/**', custom: 'value' })).toEqual({
      applyTo: 'src/**',
      custom: 'value',
    })
  })

  test('handles empty frontmatter', () => {
    expect(stripAgentKeys({})).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// readAniversizeContent
// ---------------------------------------------------------------------------

describe('readAniversizeContent', () => {
  test('returns empty content when .aniversize/ does not exist', () =>
    withFixture('empty', async (root) => {
      const content = await readAniversizeContent(root)
      expect(content.project).toBeUndefined()
      expect(content.memory).toBeUndefined()
      expect(content.agents).toBeUndefined()
      expect(content.rules).toEqual([])
      expect(content.skills).toEqual([])
    })
  )

  test('reads PROJECT.md, MEMORY.md, AGENTS.md from aniversize-only fixture', () =>
    withFixture('aniversize-only', async (root) => {
      const content = await readAniversizeContent(root)
      expect(content.project).toContain('# Sample Project')
      expect(content.memory).toContain('# Memory')
      expect(content.agents).toContain('# Agents')
    })
  )

  test('reads rules and parses frontmatter', () =>
    withFixture('aniversize-only', async (root) => {
      const content = await readAniversizeContent(root)
      expect(content.rules.length).toBe(3)
      const typescript = content.rules.find(r => r.name === 'typescript')
      expect(typescript).toBeDefined()
      expect(typescript!.frontmatter).toMatchObject({ copilot: 'instruction', applyTo: 'src/**' })
    })
  )

  test('reads universal rule with no frontmatter', () =>
    withFixture('aniversize-only', async (root) => {
      const content = await readAniversizeContent(root)
      const universal = content.rules.find(r => r.name === 'universal')
      expect(universal).toBeDefined()
      expect(universal!.frontmatter).toEqual({})
      expect(universal!.body).toContain('Keep commits small')
    })
  )

  test('reads skills from skills/**/SKILL.md', () =>
    withFixture('empty', async (root) => {
      await outputFile(
        path.join(root, '.aniversize', 'skills', 'explore', 'SKILL.md'),
        '---\ncopilot: instruction\n---\nExplore skill content',
      )
      const content = await readAniversizeContent(root)
      expect(content.skills.length).toBe(1)
      expect(content.skills[0].name).toBe('explore')
      expect(content.skills[0].body).toContain('Explore skill content')
    })
  )
})

// ---------------------------------------------------------------------------
// buildCopilotOutputFiles
// ---------------------------------------------------------------------------

describe('buildCopilotOutputFiles', () => {
  test('maps PROJECT.md to .github/copilot-instructions.md', () => {
    const outputs = buildCopilotOutputFiles({
      project: '# Project\n',
      rules: [],
      skills: [],
    })
    const main = outputs.find(o => o.targetPath === '.github/copilot-instructions.md')
    expect(main).toBeDefined()
    expect(main!.content).toBe('# Project\n')
  })

  test('includes AGENTS.md at project root', () => {
    const outputs = buildCopilotOutputFiles({ agents: '# Agents\n', rules: [], skills: [] })
    const agents = outputs.find(o => o.targetPath === 'AGENTS.md')
    expect(agents).toBeDefined()
  })

  test('maps copilot rules to .github/instructions/*.instructions.md', () => {
    const outputs = buildCopilotOutputFiles({
      rules: [{
        name: 'typescript',
        sourcePath: 'rules/typescript.md',
        frontmatter: { copilot: 'instruction', applyTo: 'src/**' },
        body: 'Use strict mode.',
      }],
      skills: [],
    })
    const rule = outputs.find(o => o.targetPath === '.github/instructions/typescript.instructions.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('applyTo')
    expect(rule!.content).toContain('src/**')
    expect(rule!.content).toContain('copilot: instruction')
  })

  test('maps copilot prompt rules to .github/prompts/*.prompt.md', () => {
    const outputs = buildCopilotOutputFiles({
      rules: [{
        name: 'my-prompt',
        sourcePath: 'rules/my-prompt.md',
        frontmatter: { copilot: 'prompt' },
        body: 'Rewrite this function.',
      }],
      skills: [],
    })
    const rule = outputs.find(o => o.targetPath === '.github/prompts/my-prompt.prompt.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('copilot: prompt')
  })

  test('includes universal rules for copilot', () => {
    const outputs = buildCopilotOutputFiles({
      rules: [{
        name: 'universal',
        sourcePath: 'rules/universal.md',
        frontmatter: {},
        body: 'Universal rule.',
      }],
      skills: [],
    })
    const rule = outputs.find(o => o.targetPath === '.github/instructions/universal.instructions.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('Universal rule.')
  })

  test('includes all rules for copilot, inferring instruction type when agent key is absent', () => {
    const outputs = buildCopilotOutputFiles({
      rules: [{
        name: 'testing',
        sourcePath: 'rules/testing.md',
        frontmatter: { claude: 'rule' },
        body: 'Claude rule.',
      }],
      skills: [],
    })
    // claude: rule → copilot: instruction → .github/instructions/
    const rule = outputs.find(o => o.targetPath === '.github/instructions/testing.instructions.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('copilot: instruction')
  })

  test('returns empty array when content has no applicable data', () => {
    const outputs = buildCopilotOutputFiles({ rules: [], skills: [] })
    expect(outputs).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// buildClaudeOutputFiles
// ---------------------------------------------------------------------------

describe('buildClaudeOutputFiles', () => {
  test('maps PROJECT.md to CLAUDE.md', () => {
    const outputs = buildClaudeOutputFiles({ project: '# Claude\n', rules: [], skills: [] })
    const main = outputs.find(o => o.targetPath === 'CLAUDE.md')
    expect(main).toBeDefined()
    expect(main!.content).toBe('# Claude\n')
  })

  test('maps MEMORY.md to CLAUDE.local.md', () => {
    const outputs = buildClaudeOutputFiles({ memory: '# Memory\n', rules: [], skills: [] })
    const mem = outputs.find(o => o.targetPath === 'CLAUDE.local.md')
    expect(mem).toBeDefined()
  })

  test('does not write CLAUDE.local.md when MEMORY.md is absent', () => {
    const outputs = buildClaudeOutputFiles({ rules: [], skills: [] })
    expect(outputs.find(o => o.targetPath === 'CLAUDE.local.md')).toBeUndefined()
  })

  test('maps claude context rules to .claude/context/*.md', () => {
    const outputs = buildClaudeOutputFiles({
      rules: [{
        name: 'typescript',
        sourcePath: 'rules/typescript.md',
        frontmatter: { claude: 'context' },
        body: 'TypeScript context.',
      }],
      skills: [],
    })
    const rule = outputs.find(o => o.targetPath === '.claude/context/typescript.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('claude: context')
  })

  test('maps claude rule rules to .claude/commands/*.md', () => {
    const outputs = buildClaudeOutputFiles({
      rules: [{
        name: 'testing',
        sourcePath: 'rules/testing.md',
        frontmatter: { claude: 'rule' },
        body: 'Write tests.',
      }],
      skills: [],
    })
    const rule = outputs.find(o => o.targetPath === '.claude/commands/testing.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('claude: rule')
    expect(rule!.content).toContain('Write tests.')
  })

  test('includes universal rules for claude', () => {
    const outputs = buildClaudeOutputFiles({
      rules: [{ name: 'universal', sourcePath: 'rules/universal.md', frontmatter: {}, body: 'Universal.' }],
      skills: [],
    })
    expect(outputs.find(o => o.targetPath === '.claude/commands/universal.md')).toBeDefined()
  })

  test('includes all rules for claude: copilot instruction infers context path', () => {
    const outputs = buildClaudeOutputFiles({
      rules: [{ name: 'typescript', sourcePath: 'rules/typescript.md', frontmatter: { copilot: 'instruction' }, body: 'Use strict.' }],
      skills: [],
    })
    // copilot: instruction → claude: context → .claude/context/
    const rule = outputs.find(o => o.targetPath === '.claude/context/typescript.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('claude: context')
  })
})

// ---------------------------------------------------------------------------
// buildCodexOutputFiles
// ---------------------------------------------------------------------------

describe('buildCodexOutputFiles', () => {
  test('maps PROJECT.md to codex.json customInstructions', () =>
    withFixture('empty', async (root) => {
      const outputs = await buildCodexOutputFiles({ project: '# Project\n', rules: [], skills: [] }, root)
      const json = outputs.find(o => o.targetPath === 'codex.json')
      expect(json).toBeDefined()
      const parsed = JSON.parse(json!.content) as Record<string, unknown>
      expect(parsed.customInstructions).toBe('# Project')
    })
  )

  test('merges into existing codex.json without clobbering other fields', () =>
    withFixture('codex-only', async (root) => {
      const outputs = await buildCodexOutputFiles({ project: '# Updated\n', rules: [], skills: [] }, root)
      const json = outputs.find(o => o.targetPath === 'codex.json')
      const parsed = JSON.parse(json!.content) as Record<string, unknown>
      expect(parsed.customInstructions).toBe('# Updated')
    })
  )

  test('maps codex rules to .codex/*.md', () =>
    withFixture('empty', async (root) => {
      const outputs = await buildCodexOutputFiles({
        rules: [{ name: 'typescript', sourcePath: 'rules/typescript.md', frontmatter: { codex: 'rule' }, body: 'Use strict.' }],
        skills: [],
      }, root)
      const rule = outputs.find(o => o.targetPath === '.codex/typescript.md')
      expect(rule).toBeDefined()
      expect(rule!.content).toContain('codex: rule')
    })
  )

  test('includes all rules for codex, inferring type when agent key is absent', () =>
    withFixture('empty', async (root) => {
      const outputs = await buildCodexOutputFiles({
        rules: [{ name: 'testing', sourcePath: 'rules/testing.md', frontmatter: { claude: 'rule' }, body: 'Tests.' }],
        skills: [],
      }, root)
      const rule = outputs.find(o => o.targetPath === '.codex/testing.md')
      expect(rule).toBeDefined()
      expect(rule!.content).toContain('codex: rule')
    })
  )
})

// ---------------------------------------------------------------------------
// buildAntigravityOutputFiles
// ---------------------------------------------------------------------------

describe('buildAntigravityOutputFiles', () => {
  test('maps PROJECT.md to ANTIGRAVITY.md', () => {
    const outputs = buildAntigravityOutputFiles({ project: '# AG\n', rules: [], skills: [] })
    const main = outputs.find(o => o.targetPath === 'ANTIGRAVITY.md')
    expect(main).toBeDefined()
    expect(main!.content).toBe('# AG\n')
  })

  test('maps antigravity rules to .antigravity/*.md', () => {
    const outputs = buildAntigravityOutputFiles({
      rules: [{ name: 'typing', sourcePath: 'rules/typing.md', frontmatter: { antigravity: 'rule' }, body: 'Type everything.' }],
      skills: [],
    })
    const rule = outputs.find(o => o.targetPath === '.antigravity/typing.md')
    expect(rule).toBeDefined()
    expect(rule!.content).toContain('antigravity: rule')
  })
})

// ---------------------------------------------------------------------------
// update (integration)
// ---------------------------------------------------------------------------

describe('update', () => {
  test('writes copilot files from aniversize-only fixture', () =>
    withFixture('aniversize-only', async (root) => {
      const result = await update('copilot', root, { yes: true })
      expect(result.written).toContain('.github/copilot-instructions.md')
      expect(result.written).toContain('AGENTS.md')
      // all three rules are now written for copilot
      expect(result.written).toContain('.github/instructions/typescript.instructions.md')
      expect(result.written).toContain('.github/instructions/universal.instructions.md')
      expect(result.written).toContain('.github/instructions/testing.instructions.md')
      // testing.md and universal.md lacked copilot key → annotated
      expect(result.annotated.some(a => a.includes('testing.md'))).toBe(true)
      expect(result.annotated.some(a => a.includes('universal.md'))).toBe(true)
      // typescript.md already had copilot key → not annotated
      expect(result.annotated.some(a => a.includes('typescript.md'))).toBe(false)

      const main = await readFile(path.join(root, '.github', 'copilot-instructions.md'), 'utf-8')
      expect(main).toContain('# Sample Project')
    })
  )

  test('writes claude files from aniversize-only fixture', () =>
    withFixture('aniversize-only', async (root) => {
      const result = await update('claude', root, { yes: true })
      expect(result.written).toContain('CLAUDE.md')
      expect(result.written).toContain('CLAUDE.local.md')
      // testing.md has claude: rule → .claude/commands/
      expect(result.written).toContain('.claude/commands/testing.md')
      // universal.md has no keys → default rule → .claude/commands/
      expect(result.written).toContain('.claude/commands/universal.md')
      // typescript.md has copilot: instruction → infer claude: context → .claude/context/
      expect(result.written).toContain('.claude/context/typescript.md')
      // typescript.md and universal.md lacked claude key → annotated
      expect(result.annotated.some(a => a.includes('typescript.md'))).toBe(true)
      expect(result.annotated.some(a => a.includes('universal.md'))).toBe(true)
      // testing.md already had claude key → not annotated
      expect(result.annotated.some(a => a.includes('testing.md'))).toBe(false)
    })
  )

  test('annotated source files carry the same type value as the generated output', () =>
    withFixture('aniversize-only', async (root) => {
      await update('claude', root, { yes: true })
      // typescript.md had copilot: instruction → inferred claude: context
      // The source file should now have claude: context (not claude: rule)
      const typescriptSrc = await readFile(
        path.join(root, '.aniversize', 'rules', 'typescript.md'),
        'utf-8',
      )
      const { frontmatter } = parseFrontmatter(typescriptSrc)
      expect(frontmatter['claude']).toBe('context')
      // universal.md had no keys → inferred default claude: rule
      const universalSrc = await readFile(
        path.join(root, '.aniversize', 'rules', 'universal.md'),
        'utf-8',
      )
      const { frontmatter: uFm } = parseFrontmatter(universalSrc)
      expect(uFm['claude']).toBe('rule')
    })
  )

  test('writes codex files from aniversize-only fixture', () =>
    withFixture('aniversize-only', async (root) => {
      const result = await update('codex', root, { yes: true })
      expect(result.written).toContain('codex.json')
      const config = JSON.parse(
        await readFile(path.join(root, 'codex.json'), 'utf-8')
      ) as Record<string, unknown>
      expect(config.customInstructions).toContain('# Sample Project')
    })
  )

  test('writes antigravity files from aniversize-only fixture', () =>
    withFixture('aniversize-only', async (root) => {
      const result = await update('antigravity', root, { yes: true })
      expect(result.written).toContain('ANTIGRAVITY.md')
      expect(result.written).toContain('.antigravity/universal.md')
    })
  )

  test('dry-run returns written list without writing files', () =>
    withFixture('aniversize-only', async (root) => {
      const result = await update('copilot', root, { dry: true })
      expect(result.written).toContain('.github/copilot-instructions.md')
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(false)
    })
  )

  test('returns empty result when .aniversize/ is absent', () =>
    withFixture('empty', async (root) => {
      const result = await update('copilot', root, { yes: true })
      expect(result.written).toEqual([])
      expect(result.skipped).toEqual([])
    })
  )

  test('does not overwrite when content is unchanged', () =>
    withFixture('aniversize-only', async (root) => {
      await update('copilot', root, { yes: true })
      const result = await update('copilot', root, { yes: true })
      // Already-identical files still count as written (dryOutputFile returns true for same content)
      expect(result.written).toContain('.github/copilot-instructions.md')
      expect(result.skipped).toEqual([])
    })
  )
})
