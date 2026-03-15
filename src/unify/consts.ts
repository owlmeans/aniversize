import type { AgentName } from './types.js'

/** Frontmatter key written in .aniversize rules for each agent */
export const AGENT_FRONTMATTER_KEY: Record<AgentName, string> = {
  claude: 'claude',
  copilot: 'copilot',
  codex: 'codex',
  antigravity: 'antigravity',
}

/** Default rule-type value for each agent's frontmatter (used when no keys present) */
export const AGENT_RULE_VALUE: Record<AgentName, string> = {
  claude: 'rule',
  copilot: 'instruction',
  codex: 'rule',
  antigravity: 'rule',
}

/**
 * Cross-agent type inference table.
 * When the target agent key is absent, look up [sourceAgent][sourceTypeValue][targetAgent]
 * to determine what type value to use.
 *
 * Semantics:
 *   copilot `instruction` = context/guidance  →  claude `context`
 *   copilot `prompt`      = command/template  →  claude `rule`
 *   claude  `context`     = context/guidance  →  copilot `instruction`
 *   claude  `rule`        = command/rule      →  copilot `instruction`  (instructions are the main copilot type)
 *   codex   `rule`        → treated as context for claude, instruction for copilot
 *   antigravity `rule`    → same as codex
 */
export const CROSS_AGENT_TYPE: Partial<Record<AgentName, Record<string, Partial<Record<AgentName, string>>>>> = {
  copilot: {
    instruction: { claude: 'context', codex: 'rule', antigravity: 'rule' },
    prompt:      { claude: 'rule',    codex: 'rule', antigravity: 'rule' },
  },
  claude: {
    context: { copilot: 'instruction', codex: 'rule', antigravity: 'rule' },
    rule:    { copilot: 'instruction', codex: 'rule', antigravity: 'rule' },
  },
  codex: {
    rule: { copilot: 'instruction', claude: 'context', antigravity: 'rule' },
  },
  antigravity: {
    rule: { copilot: 'instruction', claude: 'context', codex: 'rule' },
  },
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
