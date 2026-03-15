import type { AgentName } from './types.js'

/** Frontmatter key written in .aniversize rules for each agent */
export const AGENT_FRONTMATTER_KEY: Record<AgentName, string> = {
  claude: 'claude',
  copilot: 'copilot',
  codex: 'codex',
  antigravity: 'antigravity',
}

/** Default rule-type value for each agent's frontmatter */
export const AGENT_RULE_VALUE: Record<AgentName, string> = {
  claude: 'rule',
  copilot: 'instruction',
  codex: 'rule',
  antigravity: 'rule',
}

/** Glob patterns (relative to .aniversize/) for files managed by unify */
export const MANAGED_GLOBS: string[] = [
  'PROJECT.md',
  'MEMORY.md',
  'rules/**/*.md',
  'skills/**/*.md',
]

/** Files inside .aniversize/ that unify must never modify or delete */
export const PROTECTED_FILES: string[] = ['meta.json', 'AGENTS.md']
