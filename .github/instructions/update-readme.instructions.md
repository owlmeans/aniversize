---
applyTo: "src/**"
---

# Keeping README Current

When you **add a new command** or **modify an existing command** (in `src/cli.ts` or any `action.ts`), you MUST also update `README.md`.

## Required changes

### 1. Commands section

Add or update the `### \`<name> [args]\`` subsection under **Commands**:

```md
### `<name> [args]`

One sentence explaining what the command does.

\`\`\`sh
aniversize <name> [options]
# Example output line 1
# Example output line 2
\`\`\`

One sentence about any important flag or edge case (optional).
```

### 2. Quick start / intro table

If the command changes the typical first-use workflow, update the introductory paragraph or the agent table at the top of the file accordingly.

## Format rules

- Keep examples minimal — show the most common invocation only.
- Use `# comment` lines inside code blocks to illustrate output; don't create separate output blocks.
- Never include implementation details; describe only what the user sees and does.
- Match the terse style already used in the file (short sentences, no marketing language).
- Do not add a "Changelog" or "What's new" section.
