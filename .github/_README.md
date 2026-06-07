# GitHub Actions

## Workflows

### `develop.yml`

**Purpose:** CI on every push, deploy on demand

**Trigger:** Push to `develop` branch

**Behavior:**

- Always runs CI (lint, typecheck, test)
- Checks commit message for `#patch` or `#deploy` marker
- If marker found:
  - Bumps patch version (e.g., `0.0.1` → `0.0.2`)
  - Builds macOS binaries (Apple Silicon + Intel)
  - Creates GitHub pre-release with artifacts

**Usage:**

```bash
# CI only
git commit -m "fix: something"
git push origin develop

# CI + deploy (commit message)
git commit -m "fix: critical bug #patch"
git push origin develop
```

Or trigger deploy from the UI: **Actions → 🚀 Develop → Run workflow** (select `develop`).

### `pr.yml`

**Purpose:** Validate PRs before merge

**Trigger:** Pull request opened/updated

**Behavior:** Runs CI (lint, typecheck, test)

## Actions

Reusable composite actions in `.github/actions/` - see individual `action.yml` files for implementation.

### `setup-pnpm`

Install Node.js LTS, pnpm, and restore pnpm store cache.

### `setup-tauri`

Install Rust toolchain with specified targets and configure build caching.

**Inputs:** `targets`, `working-directory`

### `ci`

Run lint, typecheck, and test for an app.

**Inputs:** `app` (e.g., `desktop`)

### `version-bump`

Bump patch version, update configs, commit, and create git tag.

**Inputs:** `app`, `app-directory`

**Outputs:** `version`, `tag`

**Why patch-only:** KISS - major/minor versions can be added later when needed.

### `build-tauri`

Build Tauri app for specific platform with code signing (macOS) or system dependencies (Linux).

**Inputs:** `app`, `app-directory`, `platform`, `target`, `args`, `config`

**Key steps:**

- macOS: Import Apple certificate, build with notarization
- Linux: Install system dependencies
- Build frontend and Tauri app with specified config

## Setup

**1. Enable Workflow Permissions**

Settings → Actions → General → Workflow permissions → "Read and write permissions"

**2. Add Secrets**

Settings → Environments → release-signing → Environment secrets:

| Secret                               | Value                                                               |
| ------------------------------------ | ------------------------------------------------------------------- |
| `APPLE_CERTIFICATE`                  | Base64-encoded Developer ID .p12                                    |
| `APPLE_CERTIFICATE_PASSWORD`         | Certificate password                                                |
| `APPLE_ID`                           | Apple ID email                                                      |
| `APPLE_PASSWORD`                     | App-specific password                                               |
| `APPLE_SIGNING_IDENTITY`             | Must be `Developer ID Application: Name (TEAM_ID)` for notarization |
| `APPLE_TEAM_ID`                      | Team ID (10 chars)                                                  |
| `TAURI_SIGNING_PRIVATE_KEY`          | Contents of `~/.tauri/focuscat.key` (updater signing)               |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password used during key generation                                 |

See [`.secrets.template`](.secrets.template).

**How to get secrets:**

- [Tauri macOS Code Signing Guide](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri Updater: Signing Updates](https://v2.tauri.app/plugin/updater/#signing-updates)

## Local Testing

```bash
# CI
pnpm --filter @repo/desktop lint
pnpm --filter @repo/desktop typecheck
pnpm --filter @repo/desktop test

# Build
cd apps/desktop
pnpm tauri build --config src-tauri/tauri.prod.conf.json
```

## 💡 Resources / References

- [Tauri GitHub Actions Guide](https://v2.tauri.app/distribute/pipelines/github/)
- [macOS Code Signing](https://v2.tauri.app/distribute/sign/macos/)
- [Windows Code Signing](https://v2.tauri.app/distribute/sign/windows/)
- [tauri-action Repository](https://github.com/tauri-apps/tauri-action)
