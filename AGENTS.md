# Project Agent Guide

Use this file first when working in this repository. It defines the default agent workflow and points to the more specific rules and commands.

## Repository Context

- This is the FocusCat repository: an offline-first focus timer with a macOS desktop app and web experiences for FocusCat and PomodoroCat
- The desktop app is a Tauri app with a React/TanStack Router frontend in `apps/desktop/src` and Rust backend code in `apps/desktop/src-tauri`
- The TanStack Start web app lives in `apps/web`; shared React UI and timer code lives in `packages/ui`
- macOS-native bridge code lives in `apps/desktop/crates/macos` and its Swift sources; active-window monitoring uses the published `mado` crate
- TypeScript workspaces are managed with pnpm and Turbo across `apps/*` and `packages/*`
- Rust workspace members live under `apps/*/src-tauri`; app-local Rust crates may live under an app's `crates/*`
- Architecture decisions live in `docs/decisions/`, and frontend and Rust structure conventions live in `docs/conventions/`
- Code under `apps/_deprecated` and `crates/_deprecated` is historical reference; do not revive or extend it unless the task explicitly requires that

## Working Model

- Follow the user request and explicit task constraints first
- If a rule appears to conflict with the user's explicit request or clearly implied task goal, follow the user. Mention meaningful conflicts briefly so the rule can be improved.
- Before editing, read the matching rule from `.agent/rules/` and the nearby implementation
- Before product behavior or UI copy changes, read the relevant app code, the root README, and any matching decision in `docs/decisions/`
- Before Tauri command, database, settings migration, timer/session, native bridge, or module-structure changes, read the relevant files in `docs/conventions/` and `docs/decisions/`
- Before package-level changes, read the owning `package.json`, `Cargo.toml`, or Tauri config and nearby tests
- Prefer repository conventions and local package patterns over generic defaults
- Keep changes focused on the requested behavior. Do not do unrelated cleanup or opportunistic rewrites.
- Match surrounding style unless a local, low-risk improvement makes the edited code clearer
- Add abstractions only when they remove real complexity, reduce meaningful duplication, or match an existing pattern
- Write comments, docs, and explanations for future maintainers rather than the current session
- Treat matching rules as the target standard for new and touched code. If rules conflict, the more specific package, pattern, or framework rule wins.
- Do repo-wide cleanup only when the task explicitly calls for migration

## Design Bias

- When reworking messy staged code, reduce the surface area before polishing it
- Treat generated or staged code as disposable draft work, not as an architecture to preserve
- Remove unused state, helpers, options, and lifecycle paths instead of routing around them
- Keep public methods returning only what callers actually need
- Do not add cancellation, notification, lifecycle, or migration machinery unless the current behavior requires it
- Inline one-off helpers that hide only a few lines; keep supporting logic close to its single consumer

## Git

- Use read-only git commands such as `git status`, `git diff`, `git log`, and `git show` when useful
- Do not stage, commit, create or switch branches, push, or otherwise mutate git state unless the user explicitly asks for that specific git action

## Validation

- Find the owning `package.json` or `Cargo.toml` for changed files before choosing validation
- Prefer focused checks such as `pnpm --filter @repo/desktop typecheck`, `pnpm --filter @repo/desktop ui:build`, `pnpm --filter @repo/web build`, `pnpm --filter @repo/ui test`, or `cargo test -p <crate>` when the package or crate exposes them
- Use Tauri or Rust checks for backend changes, and frontend checks for React/TypeScript-only changes
- Use Turbo filters or root `pnpm`/`cargo` commands when changes cross package boundaries or shared tooling
- Do not validate routine changes with browser-driven, Playwright/Cypress-style, or manual browser e2e testing unless explicitly asked. For UI-specific tasks, ask before starting a browser-based validation workflow.
- Report the checks you ran, and say clearly when a relevant check was skipped

## Rule Map

Use the closest matching rule for the file or behavior you are changing.

- TypeScript and TSX: `.agent/rules/typescript.md`
- React and TSX components: `.agent/rules/react.md`
- `feature-state` and `feature-react/state`: `.agent/rules/feature-state.md`
- `feature-react` bindings and forms: `.agent/rules/feature-react.md`
- `*Cx.ts` feature context pattern: `.agent/rules/cx-pattern.md`
- General code style: `.agent/rules/style-guide.md`
- Comments: `.agent/rules/comments.md`
- Writing style (prose, READMEs, commit messages): `.agent/rules/writing.md`
- `tuple-result`: `.agent/rules/tuple-result.md`
- Vitest tests: `.agent/rules/vitest.md`
- Rust: `.agent/rules/rust.md`
- Swift native bridge code: `.agent/rules/swift.md`

## Commands

Commands are reusable workflows. Use them when the user asks for that workflow.

- Review staged changes before committing: `.agent/commands/review.md`
- Implement a change in reviewable slices: `.agent/commands/incremental-implementation.md`
