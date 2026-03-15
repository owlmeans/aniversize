import type { AgentName } from '../common/types.js'
export type { AgentName }

export interface WriteIdentifyResult {
  meta: { path: string; written: boolean }
  mark: { path: string; written: boolean }
}

export interface IdentifyResult {
  primary: AgentName | null
  primaryLabel: string | null
  signals: Partial<Record<AgentName, string[]>>
  written: WriteIdentifyResult | null
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
