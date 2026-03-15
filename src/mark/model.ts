import path from 'path'
import { pathExists, readFile, outputFile } from 'fs-extra'
import type { AniversizeMeta, RunOpts } from '../common/types.js'
import { isAgentName, readMeta } from '../common/model.js'
import { dryOutputFile } from '../common/file-util.js'
import type { AniversizeMark } from './types.js'
import { MARK_PATH } from './consts.js'

const GITIGNORE = '.gitignore'

/**
 * Ensure `.aniversize.json` is mentioned in `.gitignore`.
 * Creates `.gitignore` if it doesn't exist.
 * Does nothing if the entry is already present (commented or not).
 */
async function ensureGitignoreEntry(projectRoot: string): Promise<void> {
  const gitignorePath = path.join(projectRoot, GITIGNORE)
  const existing = (await pathExists(gitignorePath))
    ? await readFile(gitignorePath, 'utf-8')
    : ''
  if (existing.includes(MARK_PATH)) return
  const appended = existing.endsWith('\n') || existing === ''
    ? `${existing}${MARK_PATH}\n`
    : `${existing}\n${MARK_PATH}\n`
  await outputFile(gitignorePath, appended, 'utf-8')
}

/** Read and parse `.aniversize.json` from the project root. Returns null if missing or malformed. */
export async function readMark(projectRoot: string): Promise<AniversizeMark | null> {
  const markPath = path.join(projectRoot, MARK_PATH)
  if (!(await pathExists(markPath))) return null
  try {
    const raw = await readFile(markPath, 'utf-8')
    const parsed = JSON.parse(raw) as AniversizeMark
    if (parsed.primary !== undefined && !isAgentName(parsed.primary)) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Write `.aniversize.json` to the project root.
 * Returns the absolute path and whether the file was actually written.
 */
export async function writeMark(
  projectRoot: string,
  mark: AniversizeMark,
  opts: RunOpts = {},
): Promise<{ path: string; written: boolean }> {
  const { dry = false, yes = false } = opts
  const markPath = path.join(projectRoot, MARK_PATH)
  const isNew = !(await pathExists(markPath))
  const written = await dryOutputFile(markPath, JSON.stringify(mark, null, 2) + '\n', dry, yes)
  if (!dry && isNew && written) {
    await ensureGitignoreEntry(projectRoot)
  }
  return { path: markPath, written }
}

/**
 * Read `.aniversize/meta.json` and deep-merge `.aniversize.json` (the mark file) on top.
 * The mark file acts as a project-level lock that overrides the machine-written meta.
 * Returns null only when neither file yields a usable result.
 */
export async function readMetaWithMark(projectRoot: string): Promise<AniversizeMeta | null> {
  const [meta, mark] = await Promise.all([readMeta(projectRoot), readMark(projectRoot)])
  if (mark === null) return meta
  if (meta === null) {
    if (mark.primary !== undefined) return { primary: mark.primary }
    return null
  }
  return { ...meta, ...mark } as AniversizeMeta
}
