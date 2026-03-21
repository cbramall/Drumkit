# Super Beats — Online Drum Machine & Beat Maker

A free, web-based drum machine and step sequencer built with React, Vite, Tailwind CSS, and Supabase. Create beats with kick, snare, open/closed hi-hat, and clap sounds using a 16-step grid sequencer.

Original design: [Figma](https://www.figma.com/design/VOhUrAiyGosapr8HlbPLtK/Enhance-Beat-Maker-Functionality)

## Features

- **16-step sequencer** with 5 instruments (kick, snare, open hi-hat, closed hi-hat, clap)
- **Web Audio API** synthesis — no sample files needed
- **Adjustable tempo** (40–300 BPM)
- **Save & load beats** — stored in Supabase for logged-in users or localStorage for guests
- **Overwrite protection** — confirmation prompt when saving over an existing beat name
- **User authentication** via Supabase Auth (email/password)
- **Keyboard shortcuts** — Space to play/stop, Escape to close modals
- **Privacy Policy & Terms of Service** pages at `/privacy` and `/terms`
- **Cookie consent banner** for transparency on localStorage/cookie usage

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The app will throw an error at startup if these are missing.

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com) and copy the project URL and anon key from **Settings > API**.
2. Run the SQL migrations in order in the Supabase SQL Editor:
   - `supabase/migrations/00001_beats.sql` — creates the `beats` table with Row-Level Security
   - `supabase/migrations/00002_beats_index_updated_at.sql` — adds an index on `updated_at`

### Development

```bash
pnpm dev
```

### Production Build

```bash
pnpm build
```

Output goes to `dist/`. This is a static SPA suitable for any static hosting provider.

## Deployment

### Security Headers

The `public/_headers` file provides production security headers compatible with Netlify and most static hosts:

- Content Security Policy (CSP)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera, microphone, geolocation disabled)
- `Strict-Transport-Security` (HSTS)

A CSP `<meta>` tag in `index.html` provides a baseline regardless of hosting platform.

### SEO

- Meta description, Open Graph, and Twitter Card tags in `index.html`
- JSON-LD structured data (`WebApplication` schema)
- `robots.txt` and `sitemap.xml` in `public/`
- Semantic HTML (`<header>`, `<nav>`, `<main>`, `<h1>`, `<footer>`)
- Preconnect hints for Google Fonts and Supabase

### Before Going Live

Update the placeholder domain (`superbeats.app`) in the following files to your actual domain:

- `index.html` — canonical URL, Open Graph URLs, JSON-LD
- `public/robots.txt` — sitemap URL
- `public/sitemap.xml` — page URLs
- `public/_headers` — Supabase preconnect (if your Supabase URL differs)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Backend / Auth | Supabase (Postgres + Auth) |
| UI Components | Radix UI, shadcn/ui |
| Routing | React Router 7 |
| Animation | Motion |
| Package Manager | pnpm |

## Project Structure

```
├── index.html                  # Entry HTML with SEO, CSP, structured data
├── public/
│   ├── _headers                # Production security headers
│   ├── favicon.png
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── main.tsx                # App entry with routing
│   ├── app/
│   │   ├── App.tsx             # Main drum machine UI
│   │   └── components/
│   │       ├── AuthProvider.tsx
│   │       ├── audio-engine.ts # Web Audio drum synthesizer
│   │       ├── CookieConsent.tsx
│   │       ├── PrivacyPolicy.tsx
│   │       ├── TermsOfService.tsx
│   │       └── ui/            # shadcn/ui components
│   ├── lib/
│   │   └── supabase.ts        # Supabase client
│   └── styles/
└── supabase/
    └── migrations/
```
