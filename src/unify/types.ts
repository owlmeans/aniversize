import type { AgentName } from '../common/types.js'
export type { AgentName }

export interface UnifyOptions {
  projectRoot: string
}

export interface SourceFile {
  /** Source path relative to project root */
  sourcePath: string
  /** Target path relative to project root (inside .aniversize/) */
  targetPath: string
  /** Content to write */
  content: string
}

export interface UnifyResult {
  agent: AgentName
  written: string[]
  deleted: string[]
  skipped: string[]
}

export interface ParsedFrontmatter {
  frontmatter: Record<string, string>
  body: string
}
