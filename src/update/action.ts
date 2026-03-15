import { isAgentName } from '../common/model.js'
import { resolveProjectRoot } from '../common/file-util.js'
import { AGENT_LABELS, AGENT_NAMES } from '../common/consts.js'
import { readMetaWithMark } from '../mark/model.js'
import { identify } from '../identify/model.js'
import type { AgentName } from './types.js'
import type { GlobalOpts } from '../types.js'
import { update } from './model.js'

export async function updateAction(agentArg?: string, opts: GlobalOpts = {}): Promise<void> {
  const { root, dry = false, yes = false } = opts
  const projectRoot = resolveProjectRoot(root)
  if (dry) console.log('Dry run — no files will be written or deleted.\n')

  let agent: AgentName

  if (agentArg != null) {
    if (!isAgentName(agentArg)) {
      console.error(`Error: Unknown agent "${agentArg}". Valid agents: ${AGENT_NAMES.join(', ')}`)
      process.exit(1)
    }
    agent = agentArg
  } else {
    const meta = await readMetaWithMark(projectRoot)
    if (meta !== null) {
      if (!isAgentName(meta.primary)) {
        console.error('Error: .aniversize configuration has no valid primary agent. Run `aniversize identify` first.')
        process.exit(1)
      }
      agent = meta.primary
      console.log(`Using primary agent from .aniversize configuration: ${AGENT_LABELS[agent]}\n`)
    } else {
      console.log('No agent specified and no .aniversize configuration found — running identify…\n')
      const result = await identify(projectRoot, { dry, yes })
      if (!result.primary) {
        console.error(
          'Error: No AI coding agent configuration found in this project.\n' +
          `Specify an agent explicitly: aniversize update <${AGENT_NAMES.join('|')}>`
        )
        process.exit(1)
      }
      agent = result.primary
      console.log(`Identified primary agent: ${AGENT_LABELS[agent]}\n`)
    }
  }

  console.log(`Updating ${AGENT_LABELS[agent]} configuration from .aniversize format…\n`)

  const result = await update(agent, projectRoot, { dry, yes })

  for (const written of result.written) {
    console.log(dry ? `  would write  ${written}` : `  wrote   ${written}`)
  }
  for (const s of result.skipped) {
    console.log(`  skipped  ${s}`)
  }
  for (const a of result.annotated) {
    console.log(dry ? `  would annotate  ${a}` : `  annotated  ${a}`)
  }

  if (result.written.length === 0 && result.skipped.length === 0) {
    console.log('  Nothing to update — .aniversize/ is empty or has no applicable configuration.')
  } else {
    const verb = dry ? 'to write' : 'written'
    console.log(
      `\n${dry ? 'Dry run complete.' : 'Done.'} ${result.written.length} file(s) ${verb}, ${result.skipped.length} file(s) skipped.`
    )
  }
}
