# Direct download vs Mac App Store distribution

FocusCat ships through two macOS distribution channels: direct download and the Mac App Store. The builds differ where App Store sandboxing and review rules limit functionality.

## Why two versions?

The Mac App Store has restrictions that limit FocusCat's functionality:

1. **[App Sandbox](https://developer.apple.com/documentation/security/app-sandbox) (required)**. Sandboxed apps cannot access other processes. This blocks cross-process Accessibility API calls, which FocusCat uses for window title tracking.
2. **No private APIs ([guideline 2.5.1](https://developer.apple.com/app-store/review/guidelines/#software-requirements))**. Apple rejects apps that use non-public APIs. Tauri's `macOSPrivateApi` option (needed for transparent/overlay windows) enables a [transparent background API](https://v2.tauri.app/reference/config/) that counts as private API usage, so the cat widget can't be included.
3. **Input Monitoring for non-accessibility ([guideline 2.4.5](https://developer.apple.com/app-store/review/guidelines/#performance))**. Apps may not use Input Monitoring to read keystrokes for non-accessibility purposes. FocusCat uses it for idle detection (e.g. AFK) and cat reaction to keypress, so the App Store build does not use it.

The direct-download version is not subject to the App Store sandbox and review requirements, so it can offer the full feature set.

## Feature comparison

| Feature                                            | Direct download     | App Store       |
| -------------------------------------------------- | ------------------- | --------------- |
| Pomodoro timer                                     | Yes                 | Yes             |
| App activity tracking (which app is active)        | Yes                 | Yes             |
| Window title tracking (what's open in each app)    | Yes                 | No              |
| Idle detection & cat reaction to keypress (global) | Yes                 | No              |
| Launch at login                                    | Yes                 | Yes             |
| Cat widget (transparent overlay)                   | Yes                 | No              |
| Auto-updates                                       | Yes (Tauri updater) | Yes (App Store) |

## Why certain features are disabled

### Window title tracking

Window tracking uses the Accessibility API (`AXUIElementCreateApplication`, `AXObserverCreate`) to read other apps' window titles, bounds, and focus state. This requires cross-process access because the FocusCat process reads UI state from other running apps.

The [App Sandbox blocks cross-process Accessibility access](https://developer.apple.com/forums/thread/749494). Same-process AX access works fine (FocusCat can observe its own window changes), but the sandbox prevents reading any other app's windows. In our testing, `AXIsProcessTrusted()` returned `true` and `AXObserverCreate` succeeded, but the observer never received notifications for other apps, and `AXUIElementCopyAttributeValue` returned `nil` for their windows.

We have not found an alternative API that provides window titles from a sandboxed app. The candidates we looked at:

- **`CGWindowListCopyWindowInfo`**. Without [Screen Recording permission](https://support.apple.com/guide/mac-help/control-access-screen-system-audio-recording-mchld6aa7d23/mac), `kCGWindowName` is not available. macOS Sequoia (15+) [tightened these restrictions further](https://9to5mac.com/2024/08/14/macos-sequoia-screen-recording-prompt-monthly/) and prompts users monthly. Untested in our sandbox setup, but unlikely to be approved for App Store apps.
- **[ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit/)**. Also requires Screen Recording permission. A [persistent content capture entitlement](https://mjtsai.com/blog/2024/08/08/sequoia-screen-recording-prompts-and-the-persistent-content-capture-entitlement/) exists but Apple has not documented how to obtain it. Untested.
- **No special entitlement** for cross-process Accessibility in sandboxed apps that we could find.

**App-level tracking still works** because it uses `NSWorkspace.didActivateApplicationNotification`, which only tells you which app activated. No cross-process access needed.

### Input Monitoring

The direct build uses [rdev](https://github.com/Narsil/rdev) to listen to global keyboard and mouse events (Input Monitoring permission) for idle detection and cat reaction to keypress. [Guideline 2.4.5](https://developer.apple.com/app-store/review/guidelines/#performance) forbids using it for non-accessibility purposes, so the App Store build does not start the input listener and the permission row is hidden in settings.

### Cat widget

The cat widget is a transparent overlay that sits on top of other windows. Tauri requires `macOSPrivateApi: true` to [enable the transparent background API and fullscreen preference](https://v2.tauri.app/reference/config/). Apple [rejects apps that use non-public APIs](https://developer.apple.com/app-store/review/guidelines/#software-requirements) (guideline 2.5.1), so this feature must be disabled in the App Store build.

## Build differences

|                   | Direct download          | App Store                  |
| ----------------- | ------------------------ | -------------------------- |
| Tauri config      | `tauri.prod.conf.json`   | `tauri.appstore.conf.json` |
| Cargo feature     | (default)                | `app-store`                |
| Signing           | Developer ID (notarized) | Apple Distribution         |
| Sandbox           | No                       | Yes (`Entitlements.plist`) |
| `macOSPrivateApi` | `true`                   | `false`                    |
| Build command     | `pnpm build`             | `pnpm build:appstore`      |
| Distribution      | GitHub Releases (CI)     | Manual upload via `altool` |

## Feature gating

The `app-store` Cargo feature gates sandbox-incompatible code:

```rust
#[cfg(not(feature = "app-store"))]
// code that only runs in the direct-download version
```

The Tauri config handles the rest: `tauri.appstore.conf.json` overrides `macOSPrivateApi` to `false` and applies sandbox entitlements.

## Data storage

Both versions use the same bundle ID, but macOS stores data in different locations:

|                 | Path                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Direct download | `~/Library/Application Support/com.buildergroup.focuscat/`                                                   |
| App Store       | `~/Library/Containers/com.buildergroup.focuscat/Data/Library/Application Support/com.buildergroup.focuscat/` |

This is automatic. Sandboxed apps get a [container directory](https://developer.apple.com/documentation/security/migrating-your-app-s-files-to-its-app-sandbox-container) at `~/Library/Containers/<bundle-id>/` where macOS redirects standard path-finding APIs. The code uses the same paths. macOS handles the redirection. If a user switches between versions, their data does not carry over automatically.

## Bundle ID

Both versions use `com.buildergroup.focuscat`. macOS treats them as one app. Installing one replaces the other (data does not carry over—see Data storage). Apple supports both channels ([macOS distribution](https://developer.apple.com/macos/distribution/)).
