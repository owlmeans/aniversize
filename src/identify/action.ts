import path from 'path'
import { identify, writeIdentifyMeta } from './model.js'
import { AGENT_LABELS } from './consts.js'
import { resolveProjectRoot } from '../common/file-util.js'
import type { AgentName } from './types.js'
import type { GlobalOpts } from '../types.js'

export async function identifyAction(opts: GlobalOpts = {}): Promise<void> {
  const { root, dry = false, yes = false } = opts
  const projectRoot = resolveProjectRoot(root)
  if (dry) console.log('Dry run — no files will be written.\n')
  console.log(`Scanning ${projectRoot} for AI coding agent configurations...\n`)

  const result = await identify(projectRoot)

  if (result.primary === null) {
    console.log('No recognized AI coding agent configuration found.')
    return
  }

  for (const [agent, agentSignals] of Object.entries(result.signals) as [AgentName, string[]][]) {
    console.log(`${AGENT_LABELS[agent]}:`)
    for (const sig of agentSignals) {
      console.log(`  ${sig}`)
    }
  }

  console.log(`\nPrimary agent: ${result.primaryLabel}`)
  const meta = await writeIdentifyMeta(projectRoot, result.primary, { dry, yes })
  const relPath = path.relative(process.cwd(), meta.path)
  if (dry) {
    console.log(`Would write ${relPath}`)
  } else if (meta.written) {
    console.log(`Wrote ${relPath}`)
  } else {
    console.log(`Skipped ${relPath}`)
  }
}
