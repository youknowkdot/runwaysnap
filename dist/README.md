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
cd /workspace/runwaysnap
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

```bash
npm run build
```

Publish the **`dist/`** folder to:

- **Netlify** — `netlify.toml` already points publish at `dist` (`npm run build`)
- **Cloudflare Pages** — build command `npm run build`, output directory `dist`
- **GitHub Pages** — upload / Actions deploy of `dist/` (or root if you prefer serving without build)

This is a static site (HTML/CSS/JS). No Node runtime in production.

## Seller note — wire your checkout URL

Pro checkout is a placeholder until you plug in a real link.

1. Create a **$19 one-time** product on [Gumroad](https://gumroad.com) or [Lemon Squeezy](https://lemonsqueezy.com).
2. Open `js/config.js` and set:

```js
YOUR_CHECKOUT_URL: "https://yourstore.gumroad.com/l/runwaysnap-pro",
```

3. Rebuild / redeploy if you use `dist/`.
4. Optional: after purchase, send buyers to `https://yoursite.com/app.html?pro=1` or tell them the demo code is for demos only — for production, replace demo unlock with license validation or Gumroad’s “send download / redirect” flow.

### Demo unlock (MVP / testing)

- Code: **`RUNWAY-PRO`**
- Query param: **`?pro=1`**
- Or set `localStorage.runwaysnap_pro = "1"`

## Sample CSV

See `samples/monthly-cash.csv` and `samples/transactions.csv`.

Supported headers:

- `month,cash` (or `date` / `balance`) — estimates burn from cash deltas  
- `date,amount` — averages amount as monthly burn  

## Project layout

```
runwaysnap/
  index.html          Landing / sales
  app.html            Calculator
  css/styles.css
  js/config.js        ← YOUR_CHECKOUT_URL lives here
  js/calc.js          Runway math
  js/chart.js         SVG chart
  js/storage.js       localStorage helpers
  js/app.js           UI
  samples/            Example CSVs
  scripts/build.js    Copies to dist/
  dist/               Build output
  netlify.toml
  README.md
```

## License

MIT — use it, sell it, fork it. Replace branding as needed.
