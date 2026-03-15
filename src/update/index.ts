export type { AgentName, OutputFile, UpdateResult, AniversizeContent, AniversizeRule } from './types.js'
export { RULES_GLOB, SKILLS_GLOB } from './consts.js'
export {
  ruleAppliesTo,
  stripAgentKeys,
  readAniversizeContent,
  buildOutputFiles,
  buildCopilotOutputFiles,
  buildClaudeOutputFiles,
  buildCodexOutputFiles,
  buildAntigravityOutputFiles,
  update,
} from './model.js'
