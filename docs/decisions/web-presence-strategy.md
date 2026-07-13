# Web Presence Strategy: focuscat.app + pomodorocat.com

## Decision

Split the web presence across two domains with distinct purposes:

- **focuscat.app**: Brand home and macOS app landing page
- **pomodorocat.com**: Web Pomodoro timer and search-focused entry point

Both are served from the same `web` codebase. TanStack Router's `rewrite` option handles domain routing. Browser URLs stay clean while the router maps each request to the correct route tree.

Both sites use their apex domain as the canonical host. Vercel serves `focuscat.app` and `pomodorocat.com` as production domains. Their `www` variants use permanent `308` redirects to the corresponding apex domain. Canonical tags, sitemaps, and internal links must use the apex URLs.

## Rationale

### Why two domains

`focuscat.app` is a brand name, not a keyword. It speaks to the macOS app product. It does not signal "pomodoro timer" to search engines or users scanning results.

`pomodorocat.com` contains the exact keyword ("pomodoro") plus the product differentiator ("cat"). It targets users actively searching for a pomodoro tool, which is the correct search intent for a web timer.

Keeping both in one repo avoids duplication across shared components, `App.tsx`, and infrastructure.

### Why not more domains

Multiple domains split link authority. Two focused domains is the limit. More domains would dilute search signals without adding a distinct product purpose.

### The funnel

```
User searches "pomodoro cat" or "pomodoro timer"
  → lands on pomodorocat.com (web timer)
  → discovers the macOS app with the cat widget
  → downloads focuscat
```

The web timer is top-of-funnel for the macOS app, not a separate product.

### Realistic SEO expectations

Ranking for "pomodoro timer" (high competition) is unlikely short-term. The realistic targets are:

- "pomodoro cat"
- "cat pomodoro timer"
- "pomodoro timer cat"
- "free online cat pomodoro timer"
- "cute pomodoro timer"

These queries describe the product and match the intent of someone looking for a timer. Competitor brand names are not target keywords. Authority builds over time through useful product experiences, relevant links, and focused content.

## Architecture

Routes in `web`:

```
routes/index.tsx                    → focuscat.app/
routes/help/                        → focuscat.app/help
routes/legal.*/                     → focuscat.app/legal/*
routes/sites.pomodorocat/           → pomodorocat.com/ (browser URL stays clean)
routes/sites.pomodorocat.[...]      → pomodorocat.com/* (browser URL stays clean)
```

`router.tsx` configures a `rewrite` with `input`/`output` functions that read `url.hostname`. The router internally routes `pomodorocat.com/*` → `/sites/pomodorocat/*` while the browser URL remains `pomodorocat.com/`. TanStack Router serializes `publicHref` correctly during SSR so client hydration has no mismatch.

Pomodorocat-specific components live in `src/app/sites/pomodorocat/`.

## Alternatives Considered

- **Single domain (focuscat.app only)**: Simpler, but the domain does not describe a Pomodoro timer. This misses a relevant search entry point.
- **Separate repos per domain**: Shared components would require package extraction. This adds maintenance without a product benefit.
- **Nitro middleware URL rewriting**: Does not work with TanStack Start SSR. The rewritten path gets baked into the dehydrated router state. During hydration, the client router sees a mismatch between the browser URL and the state. It then navigates to the internal path and exposes `/sites/pomodorocat` in the URL bar.
- **Hostname detection in root loader**: Works, but requires conditional rendering in every route component that differs by domain. This becomes difficult to maintain as Pomodoro Cat gains its own pages.
