---
applyTo: "src/**"
---

Always enable strict mode in `tsconfig.json`. Prefer `interface` over `type` for
object shapes. Use `unknown` instead of `any`. Never use type assertions (`as`)
without a type guard.

Exported function signatures must have explicit parameter and return types.
