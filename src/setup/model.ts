import type { AgentName, RunOpts } from '../common/types.js'
import { writeMark } from '../mark/model.js'
import { update } from '../update/model.js'
import type { UpdateResult } from '../update/types.js'

/**
 * Write the primary agent to `.aniversize.json`, then generate all agent
 * configuration files from the `.aniversize/` universal format.
 */
export async function setup(
  agent: AgentName,
  projectRoot: string,
  opts: RunOpts = {},
): Promise<UpdateResult> {
  await writeMark(projectRoot, { primary: agent }, opts)
  return update(agent, projectRoot, opts)
}
