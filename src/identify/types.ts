import type { AgentName } from '../common/types.js'
export type { AgentName }

export interface IdentifyResult {
  primary: AgentName | null
  primaryLabel: string | null
  signals: Partial<Record<AgentName, string[]>>
}

export interface SignatureDef {
  name: AgentName
  rootFiles: string[]
  rootFolders: string[]
  deepGlobs: string[]
}

export interface AgentScore {
  name: AgentName
  score: number
  signals: string[]
}
