/**
 * Simple SVG runway chart — no dependencies.
 * Brand: cyan line + soft area glow on dark backgrounds.
 */
window.RSChart = {
  render(svgEl, labels, values) {
    if (!svgEl) return;
    const w = 640;
    const h = 220;
    const pad = { t: 16, r: 16, b: 36, l: 56 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;

    const n = values.length;
    if (n < 2) {
      svgEl.innerHTML =
        '<text x="50%" y="50%" text-anchor="middle" fill="#6b7380" font-size="14">Add inputs to see your runway</text>';
      svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svgEl.setAttribute("role", "img");
      svgEl.setAttribute("aria-label", "Empty runway chart");
      return;
    }

    const finite = values.map((v) => (isFinite(v) ? Math.max(0, v) : 0));
    const maxV = Math.max(...finite, 1);
    const minV = 0;

    const xAt = (i) => pad.l + (i / (n - 1)) * iw;
    const yAt = (v) => pad.t + ih - ((v - minV) / (maxV - minV || 1)) * ih;

    const points = finite.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
    const area =
      `${xAt(0)},${yAt(0)} ` +
      finite.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ") +
      ` ${xAt(n - 1)},${yAt(0)}`;

    const ticks = 4;
    let grid = "";
    for (let t = 0; t <= ticks; t++) {
      const v = (maxV / ticks) * t;
      const y = yAt(v);
      let label;
      if (v >= 1e9) label = "$" + (v / 1e9).toFixed(1) + "B";
      else if (v >= 1000) label = "$" + Math.round(v / 1000) + "k";
      else label = "$" + Math.round(v);
      grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="#6b7380" font-size="11" font-family="system-ui,sans-serif">${label}</text>`;
    }

    let xLabels = "";
    const step = Math.max(1, Math.floor((n - 1) / 5));
    for (let i = 0; i < n; i += step) {
      xLabels += `<text x="${xAt(i)}" y="${h - 10}" text-anchor="middle" fill="#6b7380" font-size="11" font-family="system-ui,sans-serif">${labels[i]}</text>`;
    }
    if ((n - 1) % step !== 0) {
      const i = n - 1;
      xLabels += `<text x="${xAt(i)}" y="${h - 10}" text-anchor="middle" fill="#6b7380" font-size="11" font-family="system-ui,sans-serif">${labels[i]}</text>`;
    }

    const uid = "rs" + Math.random().toString(36).slice(2, 8);
    const endFill = finite[n - 1] <= 0 ? "#f87171" : "#00fbff";

    svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svgEl.setAttribute("role", "img");
    svgEl.setAttribute(
      "aria-label",
      "Chart of projected cash balance over months"
    );
    svgEl.innerHTML = `
      <defs>
        <linearGradient id="${uid}-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00fbff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#00fbff" stop-opacity="0.02"/>
        </linearGradient>
        <filter id="${uid}-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      ${grid}
      <polygon points="${area}" fill="url(#${uid}-area)"/>
      <polyline points="${points}" fill="none" stroke="#00fbff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#${uid}-glow)" opacity="0.95"/>
      <circle cx="${xAt(0)}" cy="${yAt(finite[0])}" r="4" fill="#00fbff"/>
      <circle cx="${xAt(n - 1)}" cy="${yAt(finite[n - 1])}" r="5" fill="${endFill}" style="filter:drop-shadow(0 0 6px ${endFill})"/>
      ${xLabels}
    `;
  },
};
