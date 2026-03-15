import enquirer from 'enquirer'
import { resolveProjectRoot } from '../common/file-util.js'
import { isAgentName } from '../common/model.js'
import { AGENT_NAMES, AGENT_LABELS } from '../common/consts.js'
import { readMark } from '../mark/model.js'
import type { AgentName } from '../common/types.js'
import type { GlobalOpts } from '../types.js'
import { setup } from './model.js'

export async function setupAction(agentArg?: string, opts: GlobalOpts = {}): Promise<void> {
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
    // Read ONLY .aniversize.json — deliberately skip meta.json
    const mark = await readMark(projectRoot)
    if (mark?.primary != null && isAgentName(mark.primary)) {
      agent = mark.primary
      console.log(`Using primary agent from .aniversize.json: ${AGENT_LABELS[agent]}\n`)
    } else {
      // Fall back to interactive select, same as the switch command
      const response = await (enquirer as unknown as {
        prompt: <T>(opts: object) => Promise<T>
      }).prompt<{ agent: AgentName }>({
        type: 'select',
        name: 'agent',
        message: 'Select primary agent',
        choices: AGENT_NAMES.map(name => ({ name, message: AGENT_LABELS[name] })),
      })
      agent = response.agent
    }
  }

  console.log(`Setting up ${AGENT_LABELS[agent]} configuration…\n`)

  const result = await setup(agent, projectRoot, { dry, yes })

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
