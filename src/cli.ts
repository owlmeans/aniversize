import { Command } from 'commander'
import { version } from '../package.json' with { type: 'json' }
import { run } from './index.js'
import { identifyAction } from './identify/action.js'
import { unifyAction } from './unify/action.js'
import type { GlobalOpts } from './types.js'

const program = new Command()

program
  .name('aniversize')
  .description('Universal AI coding agent configuration tool')
  .version(version, '-v, --version')
  .option('-r, --root <path>', 'project root directory (defaults to cwd)')
  .option('--dry', 'dry run — list files to create or delete without writing them')
  .option('-y, --yes', 'skip interactive confirmation — overwrite and delete without prompting')

program
  .command('identify')
  .description('Detect which AI coding agent is configured in this project')
  .action((_opts, cmd) => {
    identifyAction(cmd.optsWithGlobals() as GlobalOpts)
  })

program
  .command('unify [agent]')
  .description('Sync agent configuration files into universal .aniversize format')
  .action((agent: string | undefined, _opts, cmd) => {
    unifyAction(agent, cmd.optsWithGlobals() as GlobalOpts)
  })

program
  .argument('[args...]', 'arguments to pass through')
  .action((args: string[]) => {
    run(args)
  })

// Strip any '--' end-of-options separators injected by package manager run scripts
// (e.g. `bun run dev unify -- --dry`) so Commander sees options correctly.
program.parse(process.argv.filter(a => a !== '--'))
