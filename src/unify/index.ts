export type { AgentName, UnifyOptions, SourceFile, UnifyResult, ParsedFrontmatter } from './types.js'
export { AGENT_FRONTMATTER_KEY, AGENT_RULE_VALUE, MANAGED_GLOBS, PROTECTED_FILES } from './consts.js'
export {
  parseFrontmatter,
  serializeFrontmatter,
  readAgentSources,
  readCopilotSources,
  readClaudeSources,
  readCodexSources,
  readAntigravitySources,
  unify,
} from './model.js'
