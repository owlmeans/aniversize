import enquirer from 'enquirer'
import { resolveProjectRoot } from '../common/file-util.js'
import { isAgentName } from '../common/model.js'
import { AGENT_NAMES, AGENT_LABELS } from '../common/consts.js'
import type { AgentName } from '../common/types.js'
import { switchAgent } from './model.js'
import type { GlobalOpts } from '../types.js'

export async function switchAction(agentArg: string | undefined, opts: GlobalOpts = {}): Promise<void> {
  const projectRoot = resolveProjectRoot(opts.root)
  let agent: AgentName

  if (agentArg != null) {
    if (!isAgentName(agentArg)) {
      console.error(`Error: Unknown agent "${agentArg}". Valid agents: ${AGENT_NAMES.join(', ')}`)
      process.exit(1)
    }
    agent = agentArg
  } else {
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

  await switchAgent(projectRoot, agent)
  console.log(`Switched primary agent to ${AGENT_LABELS[agent]}`)
}
