import { pathExists, readFile } from 'fs-extra'
import path from 'path'
import type { AgentName, AniversizeMeta } from './types.js'
import { AGENT_NAMES, META_PATH } from './consts.js'

export function isAgentName(val: string): val is AgentName {
  return (AGENT_NAMES as string[]).includes(val)
}

/** Read and parse `.aniversize/meta.json`. Returns null if missing or malformed. */
export async function readMeta(projectRoot: string): Promise<AniversizeMeta | null> {
  const metaPath = path.join(projectRoot, META_PATH)
  if (!(await pathExists(metaPath))) return null
  try {
    const raw = await readFile(metaPath, 'utf-8')
    return JSON.parse(raw) as AniversizeMeta
  } catch {
    return null
  }
}
