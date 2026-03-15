import { writeMark } from '../mark/model.js'
import type { AgentName } from '../common/types.js'

/**
 * Override the primary agent in `.aniversize.json` only.
 * Always writes regardless of what was there before. Never prompts.
 */
export async function switchAgent(
  projectRoot: string,
  primary: AgentName,
): Promise<void> {
  await writeMark(projectRoot, { primary }, { dry: false, yes: true })
}
