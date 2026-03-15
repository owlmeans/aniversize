# Testing Rule

Use `bun:test` for all tests. Each test must be fully isolated — no shared mutable
state between tests. Use real temporary directories instead of mocking `fs`.

Group tests by exported function with `describe`. Name tests as plain statements.
