import { globby } from 'globby'
import { pathExists, readFile } from 'fs-extra'
import path from 'path'
import type { AgentName, ParsedFrontmatter, SourceFile, UnifyResult } from './types.js'
import { MANAGED_GLOBS } from './consts.js'
import { dryOutputFile, dryRemove } from '../common/file-util.js'
import type { RunOpts } from '../common/types.js'

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const fmRegex = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
  const match = content.match(fmRegex)
  if (!match) return { frontmatter: {}, body: content }

  const frontmatter: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) frontmatter[key] = value
  }

  return { frontmatter, body: content.slice(match[0].length) }
}

export function serializeFrontmatter(frontmatter: Record<string, string>): string {
  if (Object.keys(frontmatter).length === 0) return ''
  const lines = Object.entries(frontmatter).map(([k, v]) => {
    const needsQuotes = /[\s:{}[\],#&*?|<>=!%@`'"\\]/.test(v) || v === ''
    return `${k}: ${needsQuotes ? `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : v}`
  })
  return `---\n${lines.join('\n')}\n---\n`
}

// ---------------------------------------------------------------------------
// Per-agent source readers
// ---------------------------------------------------------------------------

export async function readCopilotSources(projectRoot: string): Promise<SourceFile[]> {
  const sources: SourceFile[] = []

  const mainPath = path.join(projectRoot, '.github', 'copilot-instructions.md')
  if (await pathExists(mainPath)) {
    const raw = await readFile(mainPath, 'utf-8')
    const { body } = parseFrontmatter(raw)
    sources.push({
      sourcePath: '.github/copilot-instructions.md',
      targetPath: '.aniversize/PROJECT.md',
      content: body.trimStart(),
    })
  }

  const instrFiles = await globby('.github/instructions/*.instructions.md', {
    cwd: projectRoot,
    absolute: false,
    dot: true,
  }).catch(() => [] as string[])

  for (const instrFile of instrFiles) {
    const raw = await readFile(path.join(projectRoot, instrFile), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(raw)

    const newFrontmatter: Record<string, string> = { copilot: 'instruction' }
    if (frontmatter.applyTo) newFrontmatter.applyTo = frontmatter.applyTo

    const ruleName = path.basename(instrFile, '.instructions.md')
    sources.push({
      sourcePath: instrFile,
      targetPath: `.aniversize/rules/${ruleName}.md`,
      content: serializeFrontmatter(newFrontmatter) + body.trimStart(),
    })
  }

  return sources
}

export async function readClaudeSources(projectRoot: string): Promise<SourceFile[]> {
  const sources: SourceFile[] = []

  const mainPath = path.join(projectRoot, 'CLAUDE.md')
  if (await pathExists(mainPath)) {
    const raw = await readFile(mainPath, 'utf-8')
    const { body } = parseFrontmatter(raw)
    sources.push({
      sourcePath: 'CLAUDE.md',
      targetPath: '.aniversize/PROJECT.md',
      content: body.trimStart(),
    })
  }

  const memPath = path.join(projectRoot, 'CLAUDE.local.md')
  if (await pathExists(memPath)) {
    const raw = await readFile(memPath, 'utf-8')
    sources.push({
      sourcePath: 'CLAUDE.local.md',
      targetPath: '.aniversize/MEMORY.md',
      content: raw,
    })
  }

  const cmdFiles = await globby('.claude/commands/*.md', {
    cwd: projectRoot,
    absolute: false,
    dot: true,
  }).catch(() => [] as string[])

  for (const cmdFile of cmdFiles) {
    const raw = await readFile(path.join(projectRoot, cmdFile), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(raw)

    const newFrontmatter: Record<string, string> = { claude: 'rule', ...frontmatter }
    const ruleName = path.basename(cmdFile, '.md')
    sources.push({
      sourcePath: cmdFile,
      targetPath: `.aniversize/rules/${ruleName}.md`,
      content: serializeFrontmatter(newFrontmatter) + body.trimStart(),
    })
  }

  return sources
}

export async function readCodexSources(projectRoot: string): Promise<SourceFile[]> {
  const sources: SourceFile[] = []

  const jsonPath = path.join(projectRoot, 'codex.json')
  if (await pathExists(jsonPath)) {
    const raw = await readFile(jsonPath, 'utf-8')
    try {
      const config = JSON.parse(raw) as Record<string, unknown>
      if (typeof config.customInstructions === 'string' && config.customInstructions.trim()) {
        sources.push({
          sourcePath: 'codex.json',
          targetPath: '.aniversize/PROJECT.md',
          content: config.customInstructions.trim() + '\n',
        })
      }
    } catch {
      // malformed JSON — skip
    }
  }

  const mdFiles = await globby('.codex/*.md', {
    cwd: projectRoot,
    absolute: false,
    dot: true,
  }).catch(() => [] as string[])

  for (const mdFile of mdFiles) {
    const raw = await readFile(path.join(projectRoot, mdFile), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(raw)

    const newFrontmatter: Record<string, string> = { codex: 'rule', ...frontmatter }
    const ruleName = path.basename(mdFile, '.md')
    sources.push({
      sourcePath: mdFile,
      targetPath: `.aniversize/rules/${ruleName}.md`,
      content: serializeFrontmatter(newFrontmatter) + body.trimStart(),
    })
  }

  return sources
}

export async function readAntigravitySources(projectRoot: string): Promise<SourceFile[]> {
  const sources: SourceFile[] = []

  const mainPath = path.join(projectRoot, 'ANTIGRAVITY.md')
  if (await pathExists(mainPath)) {
    const raw = await readFile(mainPath, 'utf-8')
    const { body } = parseFrontmatter(raw)
    sources.push({
      sourcePath: 'ANTIGRAVITY.md',
      targetPath: '.aniversize/PROJECT.md',
      content: body.trimStart(),
    })
  }

  const ruleFiles = await globby('.antigravity/*.md', {
    cwd: projectRoot,
    absolute: false,
    dot: true,
  }).catch(() => [] as string[])

  for (const ruleFile of ruleFiles) {
    const raw = await readFile(path.join(projectRoot, ruleFile), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(raw)

    const newFrontmatter: Record<string, string> = { antigravity: 'rule', ...frontmatter }
    const ruleName = path.basename(ruleFile, '.md')
    sources.push({
      sourcePath: ruleFile,
      targetPath: `.aniversize/rules/${ruleName}.md`,
      content: serializeFrontmatter(newFrontmatter) + body.trimStart(),
    })
  }

  return sources
}

export async function readAgentSources(agent: AgentName, projectRoot: string): Promise<SourceFile[]> {
  switch (agent) {
    case 'copilot': return readCopilotSources(projectRoot)
    case 'claude': return readClaudeSources(projectRoot)
    case 'codex': return readCodexSources(projectRoot)
    case 'antigravity': return readAntigravitySources(projectRoot)
  }
}

// ---------------------------------------------------------------------------
// Sync: write new files, delete stale managed files
// ---------------------------------------------------------------------------

export async function unify(agent: AgentName, projectRoot: string, opts: RunOpts = {}): Promise<UnifyResult> {
  const { dry = false, yes = false } = opts
  const sources = await readAgentSources(agent, projectRoot)
  const aniversizeDir = path.join(projectRoot, '.aniversize')

  const existingManaged = await globby(MANAGED_GLOBS, {
    cwd: aniversizeDir,
    absolute: false,
    dot: false,
  }).catch(() => [] as string[])

  const written: string[] = []
  const skipped: string[] = []
  const writtenRelPaths = new Set<string>()

  for (const source of sources) {
    const fullTargetPath = path.join(projectRoot, source.targetPath)
    const performed = await dryOutputFile(fullTargetPath, source.content, dry, yes)
    if (dry || performed) {
      written.push(source.targetPath)
    } else {
      skipped.push(source.targetPath)
    }
    writtenRelPaths.add(path.relative(aniversizeDir, fullTargetPath))
  }

  const deleted: string[] = []
  for (const existing of existingManaged) {
    if (!writtenRelPaths.has(existing)) {
      const performed = await dryRemove(path.join(aniversizeDir, existing), dry, yes)
      if (dry || performed) {
        deleted.push(`.aniversize/${existing}`)
      } else {
        skipped.push(`.aniversize/${existing}`)
      }
    }
  }

  return { agent, written, deleted, skipped }
}
