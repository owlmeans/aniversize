import type { AgentName, SignatureDef } from './types.js'
import { AGENT_SIGNATURE_FILES } from '../common/consts.js'

export { AGENT_LABELS } from '../common/consts.js'

// Detection priority order: index 0 wins ties (claude is highest)
export const PRIORITY: AgentName[] = ['claude', 'copilot', 'codex', 'antigravity']

export const SIGNATURES: SignatureDef[] = [
  {
    name: 'claude',
    ...AGENT_SIGNATURE_FILES.claude,
    deepGlobs: ['**/CLAUDE.md', '**/CLAUDE.local.md', '**/.claude/**/*'],
  },
  {
    name: 'copilot',
    ...AGENT_SIGNATURE_FILES.copilot,
    deepGlobs: ['**/.github/copilot-instructions.md', '**/.github/instructions/**/*'],
  },
  {
    name: 'codex',
    ...AGENT_SIGNATURE_FILES.codex,
    deepGlobs: ['**/codex.json', '**/.codex/**/*'],
  },
  {
    name: 'antigravity',
    ...AGENT_SIGNATURE_FILES.antigravity,
    deepGlobs: ['**/ANTIGRAVITY.md', '**/.antigravity/**/*'],
  },
]

export const IGNORE_PATTERNS: string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.aniversize/**',
]
