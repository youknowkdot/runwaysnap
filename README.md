# RunwaySnap

**Cash runway / burn calculator** for solo founders and small ops teams.

Free browser tool + **$19 Pro** unlock (CSV import, print-to-PDF brief, named scenarios).  
Everything runs client-side. Inputs persist in `localStorage`. No backend required.

## What’s included

| Tier | Features |
|------|----------|
| **Free** | Starting cash, monthly burn *or* income+expenses, months of runway, zero-cash date, SVG chart, localStorage |
| **Pro** | CSV import, browser print/PDF one-page brief, named scenarios |

Landing page (`index.html`) + calculator (`app.html`) — sales-ready copy, no fake testimonials.

## Local preview

No bundler required. From the project root:

```bash
python3 -m http.server 5173
# open http://localhost:5173          → landing
# open http://localhost:5173/app.html → calculator
```

Or with npm scripts (same Python server):

```bash
npm start          # serve project root on :5173
npm run build      # copy static files to dist/
npm run preview    # serve dist/ on :4173
```

Any static file server works (`npx serve`, Caddy, nginx, etc.).

## Build & deploy

`dist/` is **not** committed — build on deploy (or run `npm run build` locally before uploading).

```bash
npm run build
```

Publish the **`dist/`** folder to:

- **Netlify** — `netlify.toml` already points publish at `dist` (`npm run build`)
- **Cloudflare Pages** — build command `npm run build`, output directory `dist`
- **GitHub Pages** — use Actions (or a manual upload) of `dist/` after `npm run build`

This is a static site (HTML/CSS/JS). No Node runtime in production.

## Ship checklist

Before you sell:

1. **Plug checkout URL** — create a **$19 one-time** product on [Gumroad](https://gumroad.com) or [Lemon Squeezy](https://lemonsqueezy.com). Open `js/config.js` and set:

   ```js
   YOUR_CHECKOUT_URL: "https://yourstore.gumroad.com/l/runwaysnap-pro",
   ```

   The default value is a clearly marked **placeholder**. Buy Pro will warn until you replace it.

2. **Deploy static host** — connect this repo to Netlify or Cloudflare Pages (build: `npm run build`, publish: `dist`). Confirm landing + calculator load over HTTPS.

3. **Post-purchase redirect tip** — point the provider’s “thank you” / redirect URL to:

   `https://yoursite.com/app.html?pro=1`

   That unlocks Pro in the buyer’s browser via `localStorage`. For production hardening later, replace demo unlock with real license validation (intentionally deferred in this MVP).

4. **Smoke-test** — free calc (incl. zero burn), Pro demo code `RUNWAY-PRO`, CSV samples under `samples/`, and Print / PDF brief.

5. **Optional** — remove or hide the “Lock Pro (testing)” control and demo-code UI once you have real checkout + license flow.

## Seller note — checkout & demo unlock

Pro checkout is a placeholder until you plug in a real link (see Ship checklist).

### Demo unlock (MVP / testing)

- Code: **`RUNWAY-PRO`**
- Query param: **`?pro=1`**
- Or set `localStorage.runwaysnap_pro = "1"`

## Sample CSV

See `samples/monthly-cash.csv`, `samples/transactions.csv`, and `samples/quoted-cash.csv`.

Supported headers:

- `month,cash` (or `date` / `balance`) — estimates burn from cash deltas  
- `date,amount` — averages amount as monthly burn  

Quoted fields (e.g. `"Apr 2026","85,000"`) are supported.

## Project layout

```
runwaysnap/
  index.html          Landing / sales
  app.html            Calculator
  css/styles.css
  js/config.js        ← YOUR_CHECKOUT_URL lives here
  js/calc.js          Runway math + CSV parse
  js/chart.js         SVG chart
  js/storage.js       localStorage helpers
  js/app.js           UI
  samples/            Example CSVs
  scripts/build.js    Copies to dist/
  dist/               Build output (gitignored)
  netlify.toml
  README.md
```

## License

MIT — use it, sell it, fork it. Replace branding as needed.
