export type AgentName = 'claude' | 'copilot' | 'codex' | 'antigravity'

/** Structure of `.aniversize/meta.json` */
export interface AniversizeMeta {
  primary: AgentName
}

/** Canonical file/folder signatures for a given agent at the project root */
export interface AgentSignatureFiles {
  rootFiles: string[]
  rootFolders: string[]
}

/** Options accepted by model-layer functions that write or delete files */
export interface RunOpts {
  dry?: boolean
  /** When true, overwrite/delete existing files without interactive confirmation */
  yes?: boolean
}
