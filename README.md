# Beatz-Maker — Online Drum Machine & Beat Maker

A free, web-based drum machine and step sequencer built with React, Vite, Tailwind CSS, and Supabase. Program beats with 8 instruments across a 16-step grid, shape the sound with a full effects chain, and save your work to the cloud.

Original design: [Figma](https://www.figma.com/design/VOhUrAiyGosapr8HlbPLtK/Enhance-Beat-Maker-Functionality)

Live: [beatz-maker.netlify.app](https://beatz-maker.netlify.app)

---

## Features

- **16-step sequencer** with 8 instruments — Kick, Snare, Open Hi-Hat, Closed Hi-Hat, Clap, Tom, Rimshot, Cowbell
- **Click-and-drag painting** — hold and drag to fill empty cells; starting on a filled cell switches to erase mode, clearing only filled cells as you drag
- **Web Audio API synthesis** — all sounds generated procedurally, no sample files
- **Web Audio lookahead scheduling** — audio events scheduled with `AudioContext.currentTime` for drift-free timing at any BPM
- **Adjustable tempo** (40–300 BPM)
- **Effects chain** — Reverb, Delay, Dry/Wet, Chorus, Compression, Filter Cutoff/Resonance, and Swing
- **Waveform visualizer** — per-instrument animated waveforms that respond to playback
- **VU meter** — real-time frequency analyser display
- **Save & load beats** — synced to Supabase for logged-in users, localStorage for guests
- **Overwrite protection** — confirmation prompt before clobbering an existing beat
- **Beat sharing** — "Share Your Beat" copies a URL-encoded link; effects, tempo, and grid are all encoded in the `?beat=` query param; a Netlify Edge Function serves rich Open Graph previews for bots/social cards
- **User authentication** — email/password via Supabase Auth
- **Keyboard shortcuts** — `Space` to play/stop, `w` to toggle waveforms, `e` to toggle effects panel, `Escape` to close modals
- **Error boundary** — graceful crash screen with reload instead of a blank page
- **Cookie consent banner**, **Privacy Policy** (`/privacy`), and **Terms of Service** (`/terms`)

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Install

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The app throws a startup error if these are missing.

### Supabase Setup

Run the SQL migrations **in order** in the Supabase SQL Editor:

| File | Purpose |
|------|---------|
| `supabase/migrations/00001_beats.sql` | Creates the `beats` table + Row-Level Security policies |
| `supabase/migrations/00002_beats_index_updated_at.sql` | Adds an index on `updated_at` for query performance |
| `supabase/migrations/00003_beats_name_check.sql` | Server-side `CHECK` constraints on beat name length and allowed characters |
| `supabase/migrations/00004_beats_effects.sql` | Adds nullable `effects` JSONB column so FX panel state is saved with each beat |
| `supabase/migrations/00005_beats_sharing.sql` | Adds `is_public` flag and a public-read RLS policy for shared beats |

### Development

```bash
pnpm dev
```

### Production Build

```bash
pnpm build
```

Output goes to `dist/`. This is a static SPA suitable for any static hosting provider (Netlify, Vercel, Cloudflare Pages, etc.).

---

## Project Structure

```
src/
  App.tsx                    # Thin composition layer — wires hooks to components
  main.tsx                   # Entry: ErrorBoundary > Router > AuthProvider > Routes
  assets/
    svg-paths.ts             # Toolbar icon SVG path data
  lib/
    audio-engine.ts          # Web Audio API drum synthesizer + effects chain
    shareBeat.ts             # URL encode/decode for beat sharing (?beat= param)
    supabase.ts              # Supabase client singleton
    types.ts                 # Shared Grid and SavedBeat types
  hooks/
    useGrid.ts               # Grid state, toggleCell, resetGrid
    usePlayback.ts           # Lookahead scheduler, tempo, step tracker, swingRef
    useSavedBeats.ts         # Beat CRUD (Supabase + localStorage), typed error codes
  components/
    AuthModal.tsx            # Unified sign-in / sign-up modal
    AuthProvider.tsx         # Auth context (signIn, signUp, signOut, user)
    CookieConsent.tsx        # Consent banner
    EffectsPanel.tsx         # FX sliders (reverb, delay, filter, chorus, compression, swing)
    ErrorBoundary.tsx        # Catches render errors, shows reload screen
    Navbar.tsx               # Fixed header with auth buttons
    SequencerGrid.tsx        # 16-step grid + animated GridCell
  pages/
    PrivacyPolicy.tsx        # /privacy route
    TermsOfService.tsx       # /terms route
  styles/
    fonts.css                # Google Fonts import
    index.css                # Retro/synthwave CSS
    tailwind.css             # Tailwind directives
public/
  _headers                   # Netlify security headers (CSP, HSTS, etc.)
  favicon.png
  robots.txt
  sitemap.xml
netlify/
  edge-functions/
    share-preview.ts         # Serves OG meta tags for shared beat URLs (bots/social)
supabase/
  migrations/                # SQL migrations (run in order)
```

---

## Architecture

The app follows a layered separation of concerns:

- **`lib/`** — pure services with no React dependency (`audio-engine`, `supabase`, `types`)
- **`hooks/`** — all stateful business logic; each hook is self-contained and independently testable
- **`components/`** — pure UI components that receive props and emit events
- **`pages/`** — route-level screen components
- **`App.tsx`** — a composition layer only: calls hooks, passes results to components

Adding a new feature means touching the relevant hook and component in isolation, not modifying a monolithic file.

---

## Deployment

### Security Headers

`public/_headers` provides production HTTP security headers for Netlify:

- `Content-Security-Policy` — allowlists self, Google Fonts, and Supabase
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` + `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — camera, microphone, geolocation disabled
- `Strict-Transport-Security` (HSTS)

### Before Going Live

Update the placeholder domain (`beatz-maker.netlify.app`) to your actual domain in:

- `index.html` — canonical URL, Open Graph URLs, JSON-LD
- `public/robots.txt` — sitemap URL
- `public/sitemap.xml` — page URLs
- `src/pages/PrivacyPolicy.tsx` — contact email

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Audio | Web Audio API (browser-native) |
| Backend / Auth | Supabase (Postgres + Auth) |
| Routing | React Router 7 |
| Package Manager | pnpm |
