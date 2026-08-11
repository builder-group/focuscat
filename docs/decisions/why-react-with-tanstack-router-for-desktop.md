# Why React with TanStack Router for Desktop

## Decision

We chose **React** as the frontend framework and **TanStack Router** as the routing solution for our Tauri desktop application.

## Rationale

### Why React

- Most popular frontend framework with extensive ecosystem
- Team familiarity reduces onboarding time and maintenance burden

### Why TanStack Router

#### Type Support

Superior TypeScript integration compared to React Router, providing full type safety for routes, params, and loaders out of the box.

#### Route Definition Clarity

Route definitions are co-located at the top of each file, making route configuration immediately visible:

```tsx
export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    return {
      message: 'Hello World'
    };
  },
  errorComponent: ({ error }) => <div>{error.message}</div>
});
```

Compare this to React Router's approach where you need to export components, loaders, and configs separately:

```tsx
// React Router example - separate exports
export async function loader() {
  return {
    message: 'Hello World'
  };
}

export function Component() {
  const { message } = useLoaderData();
  return <div>{message}</div>;
}

export function ErrorBoundary({ error }) {
  return <div>{error.message}</div>;
}
```

TanStack Router's approach is more discoverable - everything about a route is visible at the top of the file. You can register all route concerns (component, loader, errorComponent, etc.) at the top, then shift-click in VS Code to jump directly to the implementation.

#### Developer Tools

Built-in dev tools (`TanStackRouterDevtools`) provide excellent debugging capabilities during development.

### Why TanStack Router over TanStack Start

| Aspect            | TanStack Router      | TanStack Start                                      |
| ----------------- | -------------------- | --------------------------------------------------- |
| **Use case**      | Pure SPA             | Full-stack (SSR/SSG)                                |
| **Plugin**        | `TanStackRouterVite` | `tanstackStart`                                     |
| **Output**        | `dist/`              | `dist/client/` + `dist/server/`                     |
| **Server bundle** | None                 | Generated (unused in Tauri)                         |
| **Root route**    | Simple `Outlet`      | Requires `shellComponent`, `HeadContent`, `Scripts` |

TanStack Start is designed for web apps that need SSR. Its SPA mode still generates server artifacts that Tauri never uses. TanStack Router is purpose-built for SPAs -> simpler setup, smaller output, no SSR concepts leaking through.

## Alternatives Considered

- **React Router**: Less type-safe, route configuration is scattered across separate exports rather than co-located.
- **TanStack Start**: Overkill for desktop apps. Generates unused server bundles and introduces SSR concepts that don't apply to Tauri.

## Things We Don't Like

#### Error Handling

`instanceof XyzError` checks don't work in `errorComponent`. Workaround: use TypeScript type guards like `error is XyzError` instead.

#### No `React.FC`

Can't use `React.FC` for route components because it would require a `const` declaration, and `const` declarations must be defined above the Route definition (unlike function declarations which are hoisted). This means we use function declarations instead of arrow functions for components.
