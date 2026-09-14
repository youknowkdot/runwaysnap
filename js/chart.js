/**
 * Simple SVG runway chart — no dependencies.
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
        '<text x="50%" y="50%" text-anchor="middle" fill="#6b7280" font-size="14">Add inputs to see your runway</text>';
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
      grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="#e4e7ec" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="11" font-family="system-ui,sans-serif">${label}</text>`;
    }

    let xLabels = "";
    const step = Math.max(1, Math.floor((n - 1) / 5));
    for (let i = 0; i < n; i += step) {
      xLabels += `<text x="${xAt(i)}" y="${h - 10}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="system-ui,sans-serif">${labels[i]}</text>`;
    }
    if ((n - 1) % step !== 0) {
      const i = n - 1;
      xLabels += `<text x="${xAt(i)}" y="${h - 10}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="system-ui,sans-serif">${labels[i]}</text>`;
    }

    svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svgEl.setAttribute("role", "img");
    svgEl.setAttribute(
      "aria-label",
      "Chart of projected cash balance over months"
    );
    svgEl.innerHTML = `
      ${grid}
      <polygon points="${area}" fill="#e8f5ef" opacity="0.9"/>
      <polyline points="${points}" fill="none" stroke="#1f6b4a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${xAt(0)}" cy="${yAt(finite[0])}" r="4" fill="#1f6b4a"/>
      <circle cx="${xAt(n - 1)}" cy="${yAt(finite[n - 1])}" r="4" fill="${finite[n - 1] <= 0 ? "#b91c1c" : "#1f6b4a"}"/>
      ${xLabels}
    `;
  },
};
