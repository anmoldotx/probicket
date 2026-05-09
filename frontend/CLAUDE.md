# Frontend — Claude Code Instructions

## Stack
- Next.js 16 (App Router, TypeScript, React 19)
- motion v12 — import from `motion/react` (NOT framer-motion)
- TanStack Query v5
- next-view-transitions v0.3
- Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` — NO tailwind.config for tokens)
- Custom fetch interceptor at `src/lib/api/client.ts`

---

## Free-tier Gemini Protection (CRITICAL)
Every backend call except GET /health and GET /game/:id/state triggers a Gemini API call.
- NEVER trigger mutations from useEffect, on mount, or on interval
- NEVER retry mutations — `retry: 0` globally on mutations
- NEVER refetch game state in background — derive UI state from mutation response directly
- `GET /game/:id/state` is called at most ONCE per session (page-reload recovery only)
- QueryClient defaults: `staleTime: Infinity`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`
- NEVER call `queryClient.invalidateQueries` for game state

---

## Next.js 16 Patterns

### Client vs Server Components
- All pages/layouts are Server Components by default
- Add `'use client'` ONLY for: event handlers, hooks (useState/useEffect), motion components, TanStack Query hooks
- Push `'use client'` as far down the tree as possible

### Routing
- App Router only. All pages in `src/app/`
- Session ID travels via URL param: `/game?session=<uuid>`, `/result?session=<uuid>`
- Server Component page: `props.searchParams` is a Promise in Next.js 16 — use `await props.searchParams`
- Client Component: `useSearchParams()` from `next/navigation`, wrap in `<Suspense>`

### Navigation
```tsx
// Static links — use next/link (next-view-transitions wraps it for CSS view transitions)
import Link from 'next/link'
import { ViewTransitions } from 'next-view-transitions'

// Programmatic navigation — useRouter from next/navigation (unchanged in Next.js 16)
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push(`/game?session=${sessionId}`)
```

### searchParams in Server Components (Next.js 16 — async)
```tsx
export default async function Page(props: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await props.searchParams
  // use session
}
```

### Images
```tsx
import Image from 'next/image'
// Always provide width + height, or fill + className with aspect ratio
```

### Fonts (next/font/google — Tailwind v4)
```tsx
// In layout.tsx — assign CSS variables, reference in globals.css @theme
import { Space_Grotesk, DM_Sans } from 'next/font/google'
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
```

---

## Tailwind CSS v4 Syntax

### No tailwind.config.js for design tokens — use CSS @theme
```css
@import "tailwindcss";

@theme inline {
  --color-green: oklch(52% 0.17 145);
  --font-display: var(--font-space-grotesk);
}
```

### Custom CSS variables (not Tailwind utilities) go in :root, not @theme
```css
:root {
  --bg: oklch(11% 0.01 145);
}
```

### Using custom theme values in JSX
```tsx
<div className="bg-green text-display" />  /* uses @theme --color-green, --font-display */
<div style={{ background: 'var(--bg)' }} />  /* uses :root variable */
```

---

## motion/react v12 Syntax

### Imports
```tsx
// Standard ('use client' components):
import { motion, AnimatePresence, useAnimate, useMotionValue, useSpring, useTransform } from 'motion/react'

// Server Components or SSR context:
import * as motion from 'motion/react-client'
```

### Basic animated element
```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -12 }}
  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
/>
```

### Exit animations — always wrap with AnimatePresence
```tsx
<AnimatePresence mode="wait">
  {condition && <motion.div key="stable-unique-key" exit={{ opacity: 0 }} />}
</AnimatePresence>
```

### Stagger with variants
```tsx
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
}
<motion.ul variants={container} initial="hidden" animate="visible">
  <motion.li variants={item} />
</motion.ul>
```

### Gesture micro-interactions
```tsx
<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} />
```

### Layout animations
```tsx
<motion.div layout />             // smooth reflow on size/position change
<motion.div layoutId="name" />    // shared-element transition
```

### Imperative animation (useAnimate)
```tsx
const [scope, animate] = useAnimate()
await animate(scope.current, { x: [0, -6, 6, 0] }, { duration: 0.25 })
```

### Easing constants
```ts
const EASE_OUT = [0.16, 1, 0.3, 1]   // ease-out-expo — entrances
const EASE_IN  = [0.5, 0, 0.75, 0]   // ease-in-quart — exits
const SPRING   = { type: 'spring', stiffness: 380, damping: 28 }
```

### Rules
- NEVER animate layout CSS properties (width, height, padding, margin) — use `layout` prop instead
- NEVER import from `framer-motion`
- `AnimatePresence` must be inside a `'use client'` component

---

## TanStack Query v5

### Mutation
```tsx
const { mutate, isPending, data } = useMutation({
  mutationFn: (answer: AnswerValue) => gameApi.answerQuestion(sessionId, answer),
  retry: 0,
  onSuccess: (data) => { /* derive new UI state from data — no invalidateQueries */ },
})
```

### Query (session-recovery only — use sparingly)
```tsx
const { data } = useQuery({
  queryKey: ['game', sessionId],
  queryFn: () => gameApi.getState(sessionId),
  enabled: !!sessionId && needsRecovery,
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
})
```

### QueryClient (in providers/QueryProvider.tsx)
```ts
new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: 1 },
    mutations: { retry: 0 },
  },
})
```

---

## Custom API Client

NEVER call `fetch()` directly. Always:
```ts
import { apiClient } from '@/lib/api/client'
await apiClient.get<GameStateResult>(`/game/${id}/state`)
await apiClient.post<StartGameResult>('/game/start')
await apiClient.post<AnswerResult>(`/game/${id}/answer`, { answer })
await apiClient.post<void>(`/game/${id}/feedback`, { actualName })
```

---

## Design System

### Color tokens (defined in globals.css @theme)
- `--color-green` / `bg-green`, `text-green` — primary field green
- `--color-green-dim` — muted green
- `--color-yellow` / `bg-yellow`, `text-yellow` — IPL gold accent
- `--color-surface` — card background (non-Tailwind, use `style` or arbitrary `bg-[var(--surface)]`)

### Typography
- `font-display` → Space Grotesk (headings, question text, player names)
- `font-body` → DM Sans (labels, body, buttons)
- NEVER use Inter, Roboto, System-UI, Arial, Helvetica

### Hard bans (design system)
- No gradients (background, border, text)
- No glassmorphism (backdrop-filter: blur)
- No `border-l-4` or similar stripe decorations
- No `background-clip: text` gradient text
- No purple or blue in the palette

---

## Conventions
- Components: PascalCase `.tsx`
- Hooks: `use` prefix, camelCase
- Path alias: `@/` → `src/`
- `'use client'` directive goes at the very top before all imports
- No barrel `index.ts` files — import directly from the file
