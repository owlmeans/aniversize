import { globby } from 'globby'
import { pathExists, readFile } from 'fs-extra'
import path from 'path'
import type { AgentName } from '../common/types.js'
import { AGENT_NAMES } from '../common/consts.js'
import { AGENT_FRONTMATTER_KEY, AGENT_RULE_VALUE, CROSS_AGENT_TYPE } from '../unify/index.js'
import { parseFrontmatter, serializeFrontmatter } from '../unify/index.js'
import { dryOutputFile } from '../common/file-util.js'
import type { RunOpts } from '../common/types.js'
import type { AniversizeContent, AniversizeRule, OutputFile, UpdateResult } from './types.js'
import { RULES_GLOB, SKILLS_GLOB } from './consts.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a rule's frontmatter indicates it applies to the given agent.
 * A rule with no agent-specific keys is universal and applies to every agent.
 */
export function ruleAppliesTo(frontmatter: Record<string, string>, agent: AgentName): boolean {
  const hasAnyAgentKey = AGENT_NAMES.some(name => frontmatter[AGENT_FRONTMATTER_KEY[name]] !== undefined)
  if (!hasAnyAgentKey) return true
  return frontmatter[AGENT_FRONTMATTER_KEY[agent]] !== undefined
}

/**
 * Returns the type value for a specific agent.
 * 1. Uses the existing frontmatter value when the agent key is present.
 * 2. Looks at other agents' keys in the frontmatter and maps via CROSS_AGENT_TYPE.
 * 3. Falls back to AGENT_RULE_VALUE default.
 */
export function inferAgentTypeValue(frontmatter: Record<string, string>, agent: AgentName): string {
  const key = AGENT_FRONTMATTER_KEY[agent]
  if (frontmatter[key] !== undefined) return frontmatter[key]

  for (const sourceAgent of AGENT_NAMES) {
    if (sourceAgent === agent) continue
    const sourceKey = AGENT_FRONTMATTER_KEY[sourceAgent]
    const sourceValue = frontmatter[sourceKey]
    if (sourceValue !== undefined) {
      const mapped = CROSS_AGENT_TYPE[sourceAgent]?.[sourceValue]?.[agent]
      if (mapped !== undefined) return mapped
    }
  }

  return AGENT_RULE_VALUE[agent]
}

/** Target path for a copilot rule based on its type value. */
function copilotRulePath(name: string, typeVal: string): string {
  return typeVal === 'prompt'
    ? `.github/prompts/${name}.prompt.md`
    : `.github/instructions/${name}.instructions.md`
}

/** Target path for a claude rule based on its type value. */
function claudeRulePath(name: string, typeVal: string): string {
  return typeVal === 'context'
    ? `.claude/context/${name}.md`
    : `.claude/commands/${name}.md`
}

/**
 * Returns a copy of `frontmatter` with all agent-specific keys removed.
 * Used to strip `copilot`, `claude`, `codex`, `antigravity` keys before writing
 * the content into the agent's own file format.
 */
export function stripAgentKeys(frontmatter: Record<string, string>): Record<string, string> {
  const agentKeys = new Set(AGENT_NAMES.map(n => AGENT_FRONTMATTER_KEY[n]))
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!agentKeys.has(k)) out[k] = v
  }
  return out
}

async function readRulesFromGlob(
  glob: string,
  aniversizeDir: string,
  nameOf: (relPath: string) => string,
): Promise<AniversizeRule[]> {
  const files = await globby(glob, {
    cwd: aniversizeDir,
    absolute: false,
    dot: false,
  }).catch(() => [] as string[])

  const rules: AniversizeRule[] = []
  for (const relPath of files) {
    const raw = await readFile(path.join(aniversizeDir, relPath), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(raw)
    rules.push({ name: nameOf(relPath), sourcePath: relPath, frontmatter, body })
  }
  return rules
}

// ---------------------------------------------------------------------------
// Read .aniversize/ content
// ---------------------------------------------------------------------------

export async function readAniversizeContent(projectRoot: string): Promise<AniversizeContent> {
  const aniversizeDir = path.join(projectRoot, '.aniversize')

  const readOptional = async (relPath: string): Promise<string | undefined> => {
    const full = path.join(aniversizeDir, relPath)
    if (!(await pathExists(full))) return undefined
    return readFile(full, 'utf-8')
  }

  const [project, memory, agents, rules, skills] = await Promise.all([
    readOptional('PROJECT.md'),
    readOptional('MEMORY.md'),
    readOptional('AGENTS.md'),
    readRulesFromGlob(RULES_GLOB, aniversizeDir, (f) => path.basename(f, '.md')),
    readRulesFromGlob(SKILLS_GLOB, aniversizeDir, (f) => path.basename(path.dirname(f))),
  ])

  return { project, memory, agents, rules, skills }
}

// ---------------------------------------------------------------------------
// Build output files per agent
// ---------------------------------------------------------------------------

export function buildCopilotOutputFiles(content: AniversizeContent): OutputFile[] {
  const outputs: OutputFile[] = []

  if (content.project !== undefined) {
    outputs.push({
      sourcePath: 'PROJECT.md',
      targetPath: '.github/copilot-instructions.md',
      content: content.project,
    })
  }

  if (content.agents !== undefined) {
    outputs.push({
      sourcePath: 'AGENTS.md',
      targetPath: 'AGENTS.md',
      content: content.agents,
    })
  }

  for (const rule of [...content.rules, ...content.skills]) {
    const typeVal = inferAgentTypeValue(rule.frontmatter, 'copilot')
    const stripped = stripAgentKeys(rule.frontmatter)
    const outFm: Record<string, string> = { copilot: typeVal }
    if (stripped.applyTo) outFm.applyTo = stripped.applyTo
    const fmStr = serializeFrontmatter(outFm)
    outputs.push({
      sourcePath: rule.sourcePath,
      targetPath: copilotRulePath(rule.name, typeVal),
      content: fmStr + rule.body.trimStart(),
    })
  }

  return outputs
}

export function buildClaudeOutputFiles(content: AniversizeContent): OutputFile[] {
  const outputs: OutputFile[] = []

  if (content.project !== undefined) {
    outputs.push({
      sourcePath: 'PROJECT.md',
      targetPath: 'CLAUDE.md',
      content: content.project,
    })
  }

  if (content.memory !== undefined) {
    outputs.push({
      sourcePath: 'MEMORY.md',
      targetPath: 'CLAUDE.local.md',
      content: content.memory,
    })
  }

  if (content.agents !== undefined) {
    outputs.push({
      sourcePath: 'AGENTS.md',
      targetPath: 'AGENTS.md',
      content: content.agents,
    })
  }

  for (const rule of [...content.rules, ...content.skills]) {
    const typeVal = inferAgentTypeValue(rule.frontmatter, 'claude')
    const stripped = stripAgentKeys(rule.frontmatter)
    const outFm = { claude: typeVal, ...stripped }
    const fmStr = serializeFrontmatter(outFm)
    outputs.push({
      sourcePath: rule.sourcePath,
      targetPath: claudeRulePath(rule.name, typeVal),
      content: fmStr + rule.body.trimStart(),
    })
  }

  return outputs
}

export async function buildCodexOutputFiles(
  content: AniversizeContent,
  projectRoot: string,
): Promise<OutputFile[]> {
  const outputs: OutputFile[] = []

  if (content.project !== undefined) {
    const codexJsonPath = path.join(projectRoot, 'codex.json')
    let config: Record<string, unknown> = {}
    if (await pathExists(codexJsonPath)) {
      try {
        const raw = await readFile(codexJsonPath, 'utf-8')
        config = JSON.parse(raw) as Record<string, unknown>
      } catch {
        // malformed — start fresh
      }
    }
    config.customInstructions = content.project.trimEnd()
    outputs.push({
      sourcePath: 'PROJECT.md',
      targetPath: 'codex.json',
      content: JSON.stringify(config, null, 2) + '\n',
    })
  }

  if (content.agents !== undefined) {
    outputs.push({
      sourcePath: 'AGENTS.md',
      targetPath: 'AGENTS.md',
      content: content.agents,
    })
  }

  for (const rule of [...content.rules, ...content.skills]) {
    const typeVal = inferAgentTypeValue(rule.frontmatter, 'codex')
    const stripped = stripAgentKeys(rule.frontmatter)
    const outFm = { codex: typeVal, ...stripped }
    const fmStr = serializeFrontmatter(outFm)
    outputs.push({
      sourcePath: rule.sourcePath,
      targetPath: `.codex/${rule.name}.md`,
      content: fmStr + rule.body.trimStart(),
    })
  }

  return outputs
}

export function buildAntigravityOutputFiles(content: AniversizeContent): OutputFile[] {
  const outputs: OutputFile[] = []

  if (content.project !== undefined) {
    outputs.push({
      sourcePath: 'PROJECT.md',
      targetPath: 'ANTIGRAVITY.md',
      content: content.project,
    })
  }

  if (content.agents !== undefined) {
    outputs.push({
      sourcePath: 'AGENTS.md',
      targetPath: 'AGENTS.md',
      content: content.agents,
    })
  }

  for (const rule of [...content.rules, ...content.skills]) {
    const typeVal = inferAgentTypeValue(rule.frontmatter, 'antigravity')
    const stripped = stripAgentKeys(rule.frontmatter)
    const outFm = { antigravity: typeVal, ...stripped }
    const fmStr = serializeFrontmatter(outFm)
    outputs.push({
      sourcePath: rule.sourcePath,
      targetPath: `.antigravity/${rule.name}.md`,
      content: fmStr + rule.body.trimStart(),
    })
  }

  return outputs
}

export async function buildOutputFiles(
  agent: AgentName,
  content: AniversizeContent,
  projectRoot: string,
): Promise<OutputFile[]> {
  switch (agent) {
    case 'copilot': return buildCopilotOutputFiles(content)
    case 'claude': return buildClaudeOutputFiles(content)
    case 'codex': return buildCodexOutputFiles(content, projectRoot)
    case 'antigravity': return buildAntigravityOutputFiles(content)
  }
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function update(
  agent: AgentName,
  projectRoot: string,
  opts: RunOpts = {},
): Promise<UpdateResult> {
  const { dry = false, yes = false } = opts
  const content = await readAniversizeContent(projectRoot)
  const outputs = await buildOutputFiles(agent, content, projectRoot)

  const written: string[] = []
  const skipped: string[] = []
  const annotated: string[] = []

  for (const output of outputs) {
    const fullPath = path.join(projectRoot, output.targetPath)
    const performed = await dryOutputFile(fullPath, output.content, dry, yes)
    if (dry || performed) {
      written.push(output.targetPath)
    } else {
      skipped.push(output.targetPath)
    }
  }

  // Write-back: annotate source .aniversize/ rule/skill files that were missing
  // the target agent's type key so future runs are fully annotated.
  // Use the same inferred type value that was used to generate the output file
  // so both the source and the generated file carry identical agent keys.
  const aniversizeDir = path.join(projectRoot, '.aniversize')
  const agentKey = AGENT_FRONTMATTER_KEY[agent]

  for (const rule of [...content.rules, ...content.skills]) {
    if (rule.frontmatter[agentKey] !== undefined) continue
    const agentVal = inferAgentTypeValue(rule.frontmatter, agent)
    const newFm = { ...rule.frontmatter, [agentKey]: agentVal }
    const newContent = serializeFrontmatter(newFm) + rule.body.trimStart()
    const sourceFullPath = path.join(aniversizeDir, rule.sourcePath)
    const performed = await dryOutputFile(sourceFullPath, newContent, dry, yes)
    if (dry || performed) {
      annotated.push(rule.sourcePath)
    }
  }

  return { agent, written, skipped, annotated }
}
