# Modern SaaS App Shell — UI/UX Overhaul

Transform the current top-nav + scrolling-page layout into a professional sidebar-based SaaS application shell inspired by Linear, Stripe Dashboard, and Notion.

## User Review Required

> [!IMPORTANT]
> **This is a visual restructuring of the entire app layout.** Every page will look and behave differently. The current "scrolling marketing website" feel will be replaced by a "desktop application" feel with fixed sidebar, fixed topbar, and content-area scrolling.

> [!WARNING]
> **The `/chat` page** currently uses `calc(100vh - 76px)` for full-height layout. The new app shell handles this automatically, but the chat page will need its height calc updated.

### Key Design Decisions Needing Your Input

1. **Sidebar style:** I'll implement a **collapsible sidebar** (expanded with labels, collapsed to icons only). Do you want it to default to expanded or collapsed?
2. **Color scheme:** I'll keep your existing design tokens (`--sea-ink`, `--lagoon`, etc.) but refine them for the new layout. The sidebar will use a slightly darker surface. OK?
3. **The "About/Plateforme" page** — this is essentially a marketing page. In a sidebar-based app, it feels out of place. Should I keep it as a nav item or move it to a smaller "info" section?

---

## Current Architecture Problems

| Problem | Impact |
|---|---|
| **Top navbar with pill links** is a website pattern, not an app pattern | Users expect a persistent sidebar in operational tools |
| **Full-page scrolling with large hero sections** on every page | Wastes vertical space; operator must scroll past decorative headers to reach controls |
| **No persistent navigation context** | User loses orientation when switching between modules |
| **Footer takes significant vertical space** | Irrelevant for an internal operations tool |
| **Duplicate login forms** on `/` and `/intake` | Operator must authenticate twice for different sections |
| **No breadcrumb or page context** | No visual hierarchy showing where the user is |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Topbar (h-14)                    [Search] [🔔] [User] │
├────────┬────────────────────────────────────────────────┤
│        │  Page Header                                   │
│  Side  │  ┌─────────────────────────────────────┐       │
│  bar   │  │ Title + breadcrumb + page actions   │       │
│  (w-64 │  └─────────────────────────────────────┘       │
│   or   │                                                │
│  w-16) │  Content Area (scrollable)                     │
│        │  ┌─────────────────────────────────────┐       │
│ ┌────┐ │  │                                     │       │
│ │Home│ │  │  Page-specific content               │       │
│ │Desk│ │  │                                     │       │
│ │Chat│ │  │                                     │       │
│ │Info│ │  │                                     │       │
│ └────┘ │  └─────────────────────────────────────┘       │
│        │                                                │
│ ──── │  Footer (minimal, inline)                      │
│ [API]  │                                                │
│ [Theme]│                                                │
└────────┴────────────────────────────────────────────────┘
```

---

## Proposed Changes

### Layout Shell Components (NEW)

#### [NEW] [AppShell.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/components/layout/AppShell.tsx)
The root layout wrapper. Manages:
- Sidebar collapsed/expanded state (persisted to localStorage)
- CSS Grid layout: `grid-template-columns: [sidebar-width] 1fr`
- `grid-template-rows: auto 1fr` for topbar + content
- Mobile: sidebar hidden behind hamburger overlay

#### [NEW] [Sidebar.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/components/layout/Sidebar.tsx)
Persistent sidebar navigation:
- Logo/brand at top
- Nav sections: Dashboard, Intake Desk, Assistant Chat, Plateforme
- Active route indicator (left accent bar, background highlight)
- Bottom: API Docs link, Theme toggle, collapse button
- Uses `lucide-react` icons (already installed)
- Collapsed mode: icons only (w-16), expanded: icons + labels (w-64)
- Smooth `width` transition

#### [NEW] [Topbar.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/components/layout/Topbar.tsx)
Top navbar spanning the content area:
- Left: Hamburger (mobile) + breadcrumb showing current section
- Right: Quick search placeholder, notification bell (decorative for now), user profile chip with dropdown
- Height: 56px (`h-14`)
- Sticky within the content column

#### [NEW] [PageHeader.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/components/layout/PageHeader.tsx)
Contextual page header (replaces the large hero sections):
- Title (h1)
- Optional subtitle/description
- Optional right-side actions slot (buttons, badges)
- Compact: ~80px tall vs current ~200px heroes
- Retains the gradient tint system but much more subtle

---

### CSS Changes

#### [MODIFY] [styles.css](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/styles.css)
- Add new CSS variables for sidebar: `--sidebar-width`, `--sidebar-collapsed-width`, `--topbar-height`
- Add sidebar-specific surface colors
- Add sidebar nav-item styles, active states
- Refine body background to be more subtle (less "landing page", more "workspace")
- Remove the heavy body `::before` and `::after` decorative overlays
- Add new utility classes: `.app-shell`, `.sidebar`, `.topbar`, `.content-area`
- Keep all existing component classes (`.island-shell`, `.btn-primary`, etc.) — they still work inside the content area

---

### Root Layout Changes

#### [MODIFY] [__root.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/routes/__root.tsx)
- Replace `<Header />` + `{children}` + `<Footer />` with `<AppShell>{children}</AppShell>`
- Remove Header and Footer imports (they're absorbed into the shell)

---

### Page Updates

#### [MODIFY] [index.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/routes/index.tsx) — Dashboard
- Replace the massive hero section with `<PageHeader>` 
- Keep the metric tiles and pillar cards but in a tighter layout
- Remove the duplicate login form (auth will be handled at shell level eventually)
- Content fills the scrollable area naturally

#### [MODIFY] [intake.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/routes/intake.tsx) — Intake Desk
- Replace the large hero header with `<PageHeader>`
- The two-column layout (conversation list + detail) now fills the full content area
- Remove `page-wrap` width constraint — the desk should use full available width
- Conversation list becomes a true sidebar panel within the content

#### [MODIFY] [chat.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/routes/chat.tsx) — Chat
- Replace hero header with `<PageHeader>`
- Chat area fills remaining viewport automatically (no manual `calc`)
- Off-hours badge moves to page header actions slot

#### [MODIFY] [about.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/routes/about.tsx) — Platform Info
- Replace hero with `<PageHeader>`
- Tighter card layout

#### [DELETE] [Header.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/components/Header.tsx)
- Functionality absorbed into Sidebar + Topbar

#### [DELETE] [Footer.tsx](file:///c:/Users/sirag/OneDrive/Desktop/Projet%20gemini/frontend-pff-lab/src/components/Footer.tsx)
- Replaced by minimal footer line inside AppShell

---

## Component Architecture

```
src/
├── components/
│   ├── layout/                    ← NEW
│   │   ├── AppShell.tsx           ← Grid wrapper + sidebar state
│   │   ├── Sidebar.tsx            ← Persistent nav
│   │   ├── Topbar.tsx             ← Top bar with user/search
│   │   └── PageHeader.tsx         ← Reusable page header
│   ├── intake/                    ← UNCHANGED (internal components)
│   │   ├── ConversationList.tsx
│   │   ├── LoginForm.tsx
│   │   ├── MessageThread.tsx
│   │   ├── PrescriptionPanel.tsx
│   │   ├── ResultPanel.tsx
│   │   ├── SimulationPanel.tsx
│   │   └── utils.ts
│   ├── BackendHealthCard.tsx      ← UNCHANGED
│   ├── Skeleton.tsx               ← UNCHANGED
│   ├── Spinner.tsx                ← UNCHANGED
│   └── ThemeToggle.tsx            ← MODIFIED (compact for sidebar)
├── routes/
│   ├── __root.tsx                 ← MODIFIED (use AppShell)
│   ├── index.tsx                  ← MODIFIED (use PageHeader)
│   ├── intake.tsx                 ← MODIFIED (use PageHeader)
│   ├── chat.tsx                   ← MODIFIED (use PageHeader)
│   └── about.tsx                  ← MODIFIED (use PageHeader)
└── styles.css                     ← MODIFIED (add shell styles)
```

---

## UX Improvements Summary

| Before | After |
|---|---|
| Full-page scroll with large heroes | Fixed shell, content-area scroll only |
| Top navbar pills (website feel) | Sidebar with icons + labels (app feel) |
| 200px hero headers on every page | 80px compact `PageHeader` |
| No user context in nav | User chip in topbar with role badge |
| Footer with 3 cards | Minimal one-line footer |
| Mobile: nav wraps to 2 lines | Mobile: hamburger → slide-out sidebar |
| Theme toggle as nav button | Theme toggle in sidebar bottom |
| No breadcrumbs | Breadcrumb in topbar |
| No visual active route indicator | Left accent bar + bg highlight in sidebar |

---

## Open Questions

1. **Sidebar default state** — expanded or collapsed on first visit?
2. **The About/Plateforme page** — keep as full nav item or demote to sidebar footer?
3. **Should auth gating happen at the shell level?** Currently each page handles its own auth. We could gate the entire shell behind auth for a more unified flow. (Not doing this in this PR, but worth considering)

---

## Verification Plan

### Manual Verification
- Navigate all 4 pages and verify layout renders correctly
- Test sidebar collapse/expand toggle
- Test mobile hamburger menu
- Verify theme toggle works in new position
- Verify all existing functionality (login, conversations, chat) still works
- Test responsive breakpoints (mobile, tablet, desktop)

### Browser Testing
- Screenshot all pages before and after
- Test interactive flows (login → navigate → use intake desk)
