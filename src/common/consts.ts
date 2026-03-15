import type { AgentName, AgentSignatureFiles } from './types.js'

export const ANIVERSIZE_DIR = '.aniversize'
export const META_PATH = '.aniversize/meta.json'

/** All supported agent slugs in priority order (first wins ties in identify) */
export const AGENT_NAMES: AgentName[] = ['claude', 'copilot', 'codex', 'antigravity']

/** Human-readable display labels for each agent */
export const AGENT_LABELS: Record<AgentName, string> = {
  claude: 'Claude Code',
  copilot: 'GitHub Copilot',
  codex: 'Codex',
  antigravity: 'Antigravity',
}

/** Canonical root-level files and folders that signal each agent's presence */
export const AGENT_SIGNATURE_FILES: Record<AgentName, AgentSignatureFiles> = {
  claude: {
    rootFiles: ['CLAUDE.md', 'CLAUDE.local.md'],
    rootFolders: ['.claude'],
  },
  copilot: {
    rootFiles: ['.github/copilot-instructions.md'],
    rootFolders: ['.github/instructions'],
  },
  codex: {
    rootFiles: ['codex.json'],
    rootFolders: ['.codex'],
  },
  antigravity: {
    rootFiles: ['ANTIGRAVITY.md'],
    rootFolders: ['.antigravity'],
  },
}
