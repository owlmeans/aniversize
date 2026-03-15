export type { AgentName, IdentifyResult, SignatureDef, AgentScore } from './types.js'
export { AGENT_LABELS, PRIORITY, SIGNATURES, IGNORE_PATTERNS } from './consts.js'
export { scoreForDepth, scoreAgent, pickPrimary, identify, writeIdentifyMeta } from './model.js'
