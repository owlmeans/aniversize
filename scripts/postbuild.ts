import { readFileSync, writeFileSync, chmodSync } from 'node:fs'

const cliPath = 'dist/cli.js'
const content = readFileSync(cliPath, 'utf8')
writeFileSync(cliPath, '#!/usr/bin/env node\n' + content)
chmodSync(cliPath, 0o755)
console.log('✓ dist/cli.js — added shebang and chmod +x')
