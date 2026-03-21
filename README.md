# Enhance Beat Maker Functionality

This is a code bundle for Enhance Beat Maker Functionality. The original project is available at https://www.figma.com/design/VOhUrAiyGosapr8HlbPLtK/Enhance-Beat-Maker-Functionality.

## Running the code

Run `pnpm i` (or `npm i`) to install the dependencies.

Run `pnpm dev` (or `npm run dev`) to start the development server.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) and copy the project URL and anon key from **Settings > API**.
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Run the SQL in `supabase/migrations/00001_beats.sql` in the Supabase SQL Editor to create the `beats` table and RLS.
  