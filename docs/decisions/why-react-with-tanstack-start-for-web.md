# Why React with TanStack Start for Web

## Decision

We chose **React** as the frontend framework and **TanStack Start** as the full-stack framework for our web application.

## Rationale

### Why React

- Most popular frontend framework with extensive ecosystem
- Team familiarity reduces onboarding time and maintenance burden

### Why TanStack Start

#### SSR & SEO

Web applications need server-side rendering for search engine optimization. TanStack Start provides SSR out of the box with the same routing APIs as TanStack Router.

#### Backend for Frontend (BFF)

Server functions provide a Backend-for-Frontend layer. We have a separate main backend, but server functions are useful for:

- **Aggregating API calls** - Combine multiple backend requests into one response
- **Data transformation** - Shape backend responses for specific UI needs
- **Auth token handling** - Keep secrets server-side, never expose to client
- **Caching** - Cache backend responses at the edge

```tsx
import { createServerFn } from '@tanstack/react-start';

// BFF layer - aggregates and transforms data from main backend
const getDashboardData = createServerFn().handler(async () => {
  const [user, stats, notifications] = await Promise.all([
    backendApi.getUser(),
    backendApi.getStats(),
    backendApi.getNotifications()
  ]);
  return { user, stats, unreadCount: notifications.filter((n) => !n.read).length };
});
```

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

## Alternatives Considered

- **React Router**: Less type-safe, route configuration is scattered across separate exports rather than co-located.
- **Next.js**: More mature but different routing paradigm. We prefer TanStack's API design and TypeScript experience.

## Things We Don't Like

#### Error Handling

`instanceof XyzError` checks don't work in `errorComponent`. Workaround: use TypeScript type guards like `error is XyzError` instead.

#### No `React.FC`

Can't use `React.FC` for route components because it would require a `const` declaration, and `const` declarations must be defined above the Route definition (unlike function declarations which are hoisted). This means we use function declarations instead of arrow functions for components.

#### Maturity

TanStack Start is newer than alternatives like Next.js or Remix. Some features are still in development. We accept this tradeoff for the superior TypeScript experience and consistency with our desktop app routing.
