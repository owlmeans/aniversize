import type { AgentName } from '../common/types.js'
export type { AgentName }

export interface OutputFile {
  /** Source path relative to `.aniversize/` */
  sourcePath: string
  /** Target path relative to project root */
  targetPath: string
  /** Content to write */
  content: string
}

export interface UpdateResult {
  agent: AgentName
  written: string[]
  skipped: string[]
  /** Source .aniversize/ rule/skill files that received a new agent-type annotation */
  annotated: string[]
}

export interface AniversizeRule {
  /** Rule name: filename without `.md`, or skill directory name */
  name: string
  /** Path relative to `.aniversize/` */
  sourcePath: string
  frontmatter: Record<string, string>
  body: string
}

export interface AniversizeContent {
  project?: string
  memory?: string
  agents?: string
  rules: AniversizeRule[]
  skills: AniversizeRule[]
}
