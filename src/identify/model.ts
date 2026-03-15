import { pathExists } from 'fs-extra'
import { globby } from 'globby'
import path from 'path'
import type { AgentName, AgentScore, IdentifyResult, SignatureDef } from './types.js'
import { AGENT_LABELS, IGNORE_PATTERNS, PRIORITY, SIGNATURES } from './consts.js'
import { dryOutputFile } from '../common/file-util.js'
import type { RunOpts } from '../common/types.js'

export function scoreForDepth(depth: number): number {
  if (depth === 0) return 100
  if (depth === 1) return 70
  if (depth === 2) return 35
  return 12
}

export async function scoreAgent(sig: SignatureDef, root: string): Promise<AgentScore> {
  let score = 0
  const signals: string[] = []
  const counted = new Set<string>()
  const foundRootFolders: string[] = []

  for (const file of sig.rootFiles) {
    if (await pathExists(path.join(root, file))) {
      score += 100
      signals.push(file)
      counted.add(file)
    }
  }

  for (const folder of sig.rootFolders) {
    if (await pathExists(path.join(root, folder))) {
      score += 60
      signals.push(`${folder}/`)
      counted.add(`${folder}/`)
      foundRootFolders.push(folder)
    }
  }

  const deepFound = await globby(sig.deepGlobs, {
    cwd: root,
    absolute: false,
    dot: true,
    ignore: IGNORE_PATTERNS,
  }).catch(() => [] as string[])

  for (const f of deepFound) {
    if (counted.has(f)) continue

    // Skip files inside root-level folders already counted to avoid double-scoring
    if (foundRootFolders.some(rf => f.startsWith(`${rf}/`))) continue

    const depth = f.split('/').length - 1
    // Root-level files already handled above
    if (depth === 0 && sig.rootFiles.includes(f)) continue

    score += scoreForDepth(depth)
    signals.push(f)
    counted.add(f)
  }

  return { name: sig.name, score, signals }
}

export function pickPrimary(scores: AgentScore[]): AgentScore | null {
  const active = scores.filter(s => s.score > 0)
  if (active.length === 0) return null

  const maxScore = Math.max(...active.map(s => s.score))
  const tied = active.filter(s => s.score === maxScore)
  tied.sort((a, b) => PRIORITY.indexOf(a.name) - PRIORITY.indexOf(b.name))
  return tied[0]
}

export async function identify(projectRoot: string): Promise<IdentifyResult> {
  const scores = await Promise.all(
    SIGNATURES.map(sig => scoreAgent(sig, projectRoot))
  )

  const primary = pickPrimary(scores)

  const signals: Partial<Record<AgentName, string[]>> = {}
  for (const s of scores) {
    if (s.signals.length > 0) {
      signals[s.name] = s.signals
    }
  }

  return {
    primary: primary?.name ?? null,
    primaryLabel: primary ? AGENT_LABELS[primary.name] : null,
    signals,
  }
}

export async function writeIdentifyMeta(
  projectRoot: string,
  primary: AgentName,
  opts: RunOpts = {},
): Promise<{ path: string; written: boolean }> {
  const { dry = false, yes = false } = opts
  const metaPath = path.join(projectRoot, '.aniversize', 'meta.json')
  const written = await dryOutputFile(metaPath, JSON.stringify({ primary }, null, 2) + '\n', dry, yes)
  return { path: metaPath, written }
}
