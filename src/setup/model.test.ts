import { describe, test, expect, afterEach } from 'bun:test'
import { setup } from './model.js'
import { outputFile, pathExists, readFile } from 'fs-extra'
import path from 'path'
import { withFixture, copyFixture } from '../common/file-util.js'

describe('setup', () => {
  test('writes .aniversize.json with the given agent', () =>
    withFixture('aniversize-only', async (root) => {
      await setup('claude', root, { yes: true })
      const mark = JSON.parse(await readFile(path.join(root, '.aniversize.json'), 'utf-8')) as { primary: string }
      expect(mark.primary).toBe('claude')
    })
  )

  test('writes agent configuration files', () =>
    withFixture('aniversize-only', async (root) => {
      await setup('copilot', root, { yes: true })
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(true)
    })
  )

  test('dry run does not write agent files', () =>
    withFixture('aniversize-only', async (root) => {
      await setup('copilot', root, { dry: true, yes: true })
      expect(await pathExists(path.join(root, '.github', 'copilot-instructions.md'))).toBe(false)
    })
  )

  test('returns written file list', () =>
    withFixture('aniversize-only', async (root) => {
      const result = await setup('copilot', root, { yes: true })
      expect(result.written.length).toBeGreaterThan(0)
    })
  )

  test('returns empty result when .aniversize/ has no applicable config', async () => {
    const ctx = await copyFixture('empty')
    try {
      await outputFile(path.join(ctx.root, '.aniversize', 'PROJECT.md'), '# Project\n')
      const result = await setup('copilot', ctx.root, { yes: true })
      expect(result.written.length).toBeGreaterThan(0)
      await ctx.cleanup(true)
    } catch (err) {
      await ctx.cleanup(false)
      throw err
    }
  })
})
