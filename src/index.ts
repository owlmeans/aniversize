export function run(args: string[]): void {
  console.log('aniversize', args.length ? args.join(' ') : '(no args)')
}

export type { AgentName, AniversizeMeta, AgentSignatureFiles } from './common/index.js'
export { ANIVERSIZE_DIR, META_PATH, AGENT_NAMES, AGENT_LABELS, AGENT_SIGNATURE_FILES, isAgentName, readMeta } from './common/index.js'
export { identify, writeIdentifyMeta } from './identify/index.js'
export type { IdentifyResult } from './identify/index.js'
export { unify, readAgentSources, parseFrontmatter, serializeFrontmatter } from './unify/index.js'
export type { UnifyResult, SourceFile } from './unify/index.js'
