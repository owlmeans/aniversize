import path from 'path'
import { pathExists } from 'fs-extra'
import { identify, writeIdentifyMeta } from '../identify/model.js'
import { AGENT_LABELS, AGENT_NAMES, META_PATH } from '../common/consts.js'
import { isAgentName, readMeta } from '../common/model.js'
import { resolveProjectRoot } from '../common/file-util.js'
import { unify } from './model.js'
import type { AgentName } from './types.js'
import type { GlobalOpts } from '../types.js'

export async function unifyAction(agentArg?: string, opts: GlobalOpts = {}): Promise<void> {
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
    if (await pathExists(path.join(projectRoot, META_PATH))) {
      const meta = await readMeta(projectRoot)
      if (meta === null) {
        console.error('Error: .aniversize/meta.json contains invalid JSON.')
        process.exit(1)
      }
      if (!isAgentName(meta.primary)) {
        console.error('Error: .aniversize/meta.json has no valid primary agent. Run `aniversize identify` first.')
        process.exit(1)
      }
      agent = meta.primary
      console.log(`Using primary agent from .aniversize/meta.json: ${AGENT_LABELS[agent]}\n`)
    } else {
      console.log('No agent specified and no .aniversize/meta.json found — running identify…\n')
      const result = await identify(projectRoot)
      if (!result.primary) {
        console.error(
          'Error: No AI coding agent configuration found in this project.\n' +
          `Specify an agent explicitly: aniversize unify <${AGENT_NAMES.join('|')}>`
        )
        process.exit(1)
      }
      agent = result.primary
      await writeIdentifyMeta(projectRoot, agent, { dry, yes })
      console.log(`Identified primary agent: ${AGENT_LABELS[agent]}\n`)
    }
  }

  console.log(`Unifying ${AGENT_LABELS[agent]} configuration into .aniversize format…\n`)

  const result = await unify(agent, projectRoot, { dry, yes })

  for (const written of result.written) {
    console.log(dry ? `  would write  ${written}` : `  wrote   ${written}`)
  }
  for (const deleted of result.deleted) {
    console.log(dry ? `  would delete ${deleted}` : `  deleted ${deleted}`)
  }
  for (const s of result.skipped) {
    console.log(`  skipped  ${s}`)
  }

  if (result.written.length === 0 && result.deleted.length === 0 && result.skipped.length === 0) {
    console.log('  No agent configuration files found. Nothing to unify.')
  } else {
    const verb = dry ? 'to write' : 'written'
    const delVerb = dry ? 'to delete' : 'deleted'
    console.log(
      `\n${dry ? 'Dry run complete.' : 'Done.'} ${result.written.length} file(s) ${verb}, ${result.deleted.length} file(s) ${delVerb}, ${result.skipped.length} file(s) skipped.`
    )
  }
}
