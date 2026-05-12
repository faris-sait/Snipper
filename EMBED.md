# Snipper embed

A `<script>` tag any blog, newsletter, or partner site can drop in to
embed the Snipper audit flow inline.

## Quick start

```html
<script async src="https://snipper-alpha.vercel.app/embed.js"></script>
```

That's it. The script replaces itself with a responsive-width, 720px-tall
iframe pointing at the audit flow on `snipper-alpha.vercel.app`. The widget
works on any HTML page — Substack, Ghost, Notion (with embed blocks),
WordPress, plain static sites.

## Options

```html
<script
  async
  src="https://snipper-alpha.vercel.app/embed.js"
  data-snipper-height="900"
  data-snipper-theme="dark"
></script>
```

| Attribute | Default | What it does |
|---|---|---|
| `data-snipper-height` | `720` | iframe height in pixels. Bump to 900 if you expect long audits. |
| `data-snipper-theme` | `auto` | Reserved for future use; the iframe currently follows the user's `prefers-color-scheme`. |

## What you get

- Full audit flow inside the iframe — form → server-rendered result page → optional email gate → optional Credex CTA.
- No host-page JavaScript bundled. The iframe is fully sandboxed; nothing leaks into the embedding page.
- Lead capture goes through Snipper's Supabase as if the user had visited the main site directly.
- Referrer policy is `origin` only — Snipper sees that `yourblog.com` sent the user, not the specific article URL.

## What you don't get (yet)

- **postMessage events** for when an audit completes. If you want analytics
  hooks (e.g. fire a Google Analytics event when a reader books a Credex
  consult from your embed), open a PR — the iframe parent can listen to
  `window.addEventListener("message")` if we wire it up.
- **Per-publisher theming.** The iframe inherits the same dark/light theme
  Snipper uses everywhere; no custom palette pass-through yet.
- **A pre-filled stack.** A future enhancement would accept
  `data-snipper-tools="cursor,claude,copilot"` to start the form
  half-filled for use cases like "embed on a Cursor review post".

## Test the snippet locally

```bash
echo '<!doctype html><script async src="http://localhost:3000/embed.js"></script>' > /tmp/embed-test.html
open /tmp/embed-test.html   # or just open the file in a browser
```

Dev server must be running (`pnpm dev`). The iframe should load Snipper
`/audit` inside the test page.

## Implementation notes

- The script is a static asset in `public/embed.js`, served by Next as
  `/embed.js` with `Cache-Control: public, max-age=...` defaults. No build
  step, no dependency on the framework.
- The iframe URL carries `?embed=1` so we can branch styling or analytics
  later without breaking deployed embeds.
- Single-load guard (`window.__snipperEmbedLoaded`) prevents double-mount
  if the snippet is included twice on the same page.
