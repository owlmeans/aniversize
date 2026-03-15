---
copilot: instruction
applyTo: "src/**"
claude: context
codex: rule
---
# Keeping Copilot Instructions Current

When you **add a new command** or **modify an existing command** (in `src/cli.ts` or any `action.ts`), you MUST also update `.github/copilot-instructions.md`.

## Required changes

### 1. Key Commands table

Add or update the row in the **Key Commands** table:

```md
| `aniversize <name> [args]` | One-line description of what the command does |
```

### 2. Workflow section

Add or update the `### <Name> Workflow` section inside **The `.aniversize` Universal Format** block (after the last existing workflow section):

```md
### <Name> Workflow

```
aniversize <name> [options]
```

1. First step the command performs.
2. Second step.
3. ...

Any important notes about flags or edge cases.
```

If the command writes or deletes files, include a `Use \`--dry\`` sentence describing what it previews. Every such command must implement dry-run support — see `.github/instructions/dry-run-support.instructions.md`.

### 3. Project Structure

If the command adds a new source directory (e.g. `src/<feature>/`), add it to the **Project Structure** code block with a short description comment.

### 4. Conventions

If the command introduces rules that other contributors must follow (e.g. "when adding a new agent to unify, do X"), add them to the **Conventions** bullet list.

## Format rules

- Use backticks for all command names, file paths, and flag names.
- Keep workflow steps numbered and imperative ("Read …", "Write …", "Delete …").
- Never describe implementation details — describe observable behaviour only.
- Keep descriptions consistent with the style already present in the file.
