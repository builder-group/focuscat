# 😬 Technical Debt

## TypeScript 7 Hold

FocusCat currently targets TypeScript 6. TypeScript is excluded from `update:latest` so a
routine dependency refresh cannot move the repository to TypeScript 7 before that migration is
planned and tested.

### Current state

- **Pinned major:** `typescript@^6.0.3`
- **Excluded from `update:latest`:** `typescript`

### When to revisit

- When FocusCat is ready for TypeScript 7, remove the exclusion, follow the TypeScript migration
  guidance, and validate all app and library builds before adopting it.
