// Netlify Edge Function — intercepts bot/crawler requests that carry a
// ?beat= share param and returns a tiny HTML page with dynamic Open Graph
// tags so Slack, Discord, WhatsApp etc. can render a rich link preview.
// All other requests (real users, assets, etc.) are passed straight through.

import type { Context } from "https://edge.netlify.com";

// ─── Bot detection ────────────────────────────────────────────────
const BOT_RE =
  /slack|discord|telegram|twitterbot|facebookexternalhit|facebook|whatsapp|linkedin|pinterest|googlebot|bingbot|applebot|flipboard|outbrain|redditbot|embedly|quora|vkshare|w3c_validator/i;

// ─── Instrument labels (mirrors audio-engine.ts) ──────────────────
const LABELS: Record<string, string> = {
  kick:        "Kick",
  snare:       "Snare",
  openHiHat:   "Open Hi-Hat",
  closedHiHat: "Closed Hi-Hat",
  clap:        "Clap",
  tom:         "Tom",
  rimshot:     "Rimshot",
  cowbell:     "Cowbell",
};

// ─── Minimal URL-safe base64 decoder (no Node/Deno imports needed) ─
function fromUrlBase64(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

function decodeBeat(
  param: string,
): { tempo: number; trackNames: string[] } | null {
  try {
    const payload = JSON.parse(fromUrlBase64(param)) as {
      g?: Record<string, number>;
      t?: number;
    };
    if (!payload?.g || !payload?.t) return null;

    const trackNames = Object.entries(payload.g)
      .filter(([, mask]) => mask !== 0)
      .map(([inst]) => LABELS[inst] ?? inst);

    return { tempo: payload.t, trackNames };
  } catch {
    return null;
  }
}

// ─── Minimal HTML escaping to prevent injection in OG tag values ──
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Edge function handler ────────────────────────────────────────
export default async function handler(
  req: Request,
  context: Context,
): Promise<Response | void> {
  const url = new URL(req.url);
  const beatParam = url.searchParams.get("beat");
  const ua = req.headers.get("user-agent") ?? "";

  // Pass through: not a bot, or no beat param
  if (!beatParam || !BOT_RE.test(ua)) {
    return context.next();
  }

  const beat = decodeBeat(beatParam);

  const title = beat
    ? `Beatz-Maker — ${beat.tempo} BPM Beat`
    : "Beatz-Maker — Someone shared a beat!";

  const description =
    beat && beat.trackNames.length > 0
      ? `${beat.tempo} BPM · ${beat.trackNames.join(" · ")} · Click to open in Beatz-Maker!`
      : "A beat made with Beatz-Maker. Click the link to load and hear it!";

  const pageUrl = esc(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const imageUrl = `${baseUrl}/social-preview.png`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Beatz-Maker" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url"         content="${pageUrl}" />
  <meta property="og:image"       content="${esc(imageUrl)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(imageUrl)}" />

  <!-- Redirect real users to the SPA immediately -->
  <meta http-equiv="refresh" content="0; url=${pageUrl}" />
</head>
<body>
  <p><a href="${pageUrl}">${esc(title)}</a> — ${esc(description)}</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
